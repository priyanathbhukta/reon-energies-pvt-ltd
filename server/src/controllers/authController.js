import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import config from '../config/app.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// ─── Helper: Generate OTP ──────────────────────────────────
function generateOtp(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

// ─── Helper: Generate Tokens ────────────────────────────────
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
  return { accessToken, refreshToken };
}

// ─── POST /api/auth/send-otp ────────────────────────────────
// Send OTP to mobile number for login
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({ error: 'Valid 10-digit mobile number required' });
    }

    // Check rate limit — max 5 OTPs per 15 min
    const recentOtps = await pool.query(
      `SELECT COUNT(*) as count FROM otp_logs
       WHERE mobile = $1 AND otp_type = 'login' AND created_at > NOW() - INTERVAL '15 minutes'`,
      [mobile]
    );

    if (parseInt(recentOtps.rows[0].count) >= config.rateLimit.otpMax) {
      return res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
    }

    // Generate OTP
    const otp = generateOtp(config.otp.length);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + config.otp.expiresInMinutes * 60000);

    // Store OTP
    await pool.query(
      `INSERT INTO otp_logs (mobile, otp_hash, otp_type, expires_at)
       VALUES ($1, $2, 'login', $3)`,
      [mobile, otpHash, expiresAt]
    );

    // TODO: Send OTP via SMS provider (MSG91/Twilio)
    // For development, log OTP to console
    if (config.server.env === 'development') {
      console.log(`\n📱 OTP for ${mobile}: ${otp}\n`);
    }

    // In production, call SMS service here
    // await smsService.sendOtp(mobile, otp);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: config.otp.expiresInMinutes * 60,
      // Only include OTP in development for testing
      ...(config.server.env === 'development' && { _devOtp: otp }),
    });
  } catch (err) {
    console.error('Send OTP error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ─── POST /api/auth/verify-otp-login ────────────────────────
// Verify OTP and login / register
router.post('/verify-otp-login', async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ error: 'Mobile and OTP are required' });
    }

    // Find latest unused OTP for this mobile
    const otpResult = await pool.query(
      `SELECT * FROM otp_logs
       WHERE mobile = $1 AND otp_type = 'login' AND verified_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [mobile]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    const otpRecord = otpResult.rows[0];

    // Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

    if (!isValid) {
      // Increment attempts
      await pool.query(
        'UPDATE otp_logs SET attempts = attempts + 1 WHERE id = $1',
        [otpRecord.id]
      );
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // Mark OTP as verified
    await pool.query(
      'UPDATE otp_logs SET verified_at = NOW() WHERE id = $1',
      [otpRecord.id]
    );

    // Find or check user
    let userResult = await pool.query(
      'SELECT id, full_name, email, mobile, mfa_enabled FROM users WHERE mobile = $1 AND deleted_at IS NULL',
      [mobile]
    );

    if (userResult.rows.length === 0) {
      // User not found — they need to register
      return res.json({
        success: true,
        isNewUser: true,
        message: 'OTP verified. Please complete registration.',
        mobileVerified: mobile,
      });
    }

    const user = userResult.rows[0];

    // Check if MFA is enabled
    if (user.mfa_enabled) {
      const mfaToken = jwt.sign(
        { userId: user.id, mfaPending: true },
        config.jwt.accessSecret,
        { expiresIn: config.jwt.mfaExpiresIn }
      );
      return res.json({
        success: true,
        requiresMfa: true,
        accessToken: mfaToken,
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store session
    await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token, device_info, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken, JSON.stringify({}), req.ip, req.headers['user-agent']]
    );

    // Update last login
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Get partner data if exists
    const partnerResult = await pool.query(
      'SELECT id, shop_name, status, referral_code, referral_slug, commission_tier FROM pos_partners WHERE user_id = $1',
      [user.id]
    );

    // Get roles
    const rolesResult = await pool.query(
      'SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1',
      [user.id]
    );

    // Log audit
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent)
       VALUES ($1, 'login', 'auth', $2, $3)`,
      [user.id, req.ip, req.headers['user-agent']]
    );

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        roles: rolesResult.rows.map((r) => r.name),
      },
      partner: partnerResult.rows[0]
        ? {
            id: partnerResult.rows[0].id,
            shopName: partnerResult.rows[0].shop_name,
            status: partnerResult.rows[0].status,
            referralCode: partnerResult.rows[0].referral_code,
            referralSlug: partnerResult.rows[0].referral_slug,
            commissionTier: partnerResult.rows[0].commission_tier,
          }
        : null,
    });
  } catch (err) {
    console.error('Verify OTP error:', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── POST /api/auth/verify-mfa ──────────────────────────────
router.post('/verify-mfa', async (req, res) => {
  try {
    const { code } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'MFA token required' });

    const mfaToken = authHeader.split(' ')[1];
    const decoded = jwt.verify(mfaToken, config.jwt.accessSecret);

    if (!decoded.mfaPending) {
      return res.status(400).json({ error: 'Invalid MFA token' });
    }

    // Verify MFA code (email-based OTP)
    const otpResult = await pool.query(
      `SELECT * FROM otp_logs
       WHERE user_id = $1 AND otp_type = 'mfa' AND verified_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [decoded.userId]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'No MFA code found' });
    }

    const isValid = await bcrypt.compare(code, otpResult.rows[0].otp_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid MFA code' });
    }

    await pool.query('UPDATE otp_logs SET verified_at = NOW() WHERE id = $1', [otpResult.rows[0].id]);

    const { accessToken, refreshToken } = generateTokens(decoded.userId);

    // Store session
    await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [decoded.userId, refreshToken, req.ip, req.headers['user-agent']]
    );

    // Get user data
    const userResult = await pool.query(
      'SELECT id, full_name, email, mobile FROM users WHERE id = $1',
      [decoded.userId]
    );
    const partnerResult = await pool.query(
      'SELECT id, shop_name, status, referral_code, referral_slug FROM pos_partners WHERE user_id = $1',
      [decoded.userId]
    );
    const rolesResult = await pool.query(
      'SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1',
      [decoded.userId]
    );

    const user = userResult.rows[0];

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        roles: rolesResult.rows.map((r) => r.name),
      },
      partner: partnerResult.rows[0] || null,
    });
  } catch (err) {
    console.error('MFA error:', err.message);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// ─── POST /api/auth/refresh ─────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

    // Check session exists
    const session = await pool.query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW()',
      [decoded.userId, refreshToken]
    );

    if (session.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Generate new tokens
    const tokens = generateTokens(decoded.userId);

    // Update session with new refresh token
    await pool.query(
      `UPDATE user_sessions SET refresh_token = $1, expires_at = NOW() + INTERVAL '7 days'
       WHERE id = $2`,
      [tokens.refreshToken, session.rows[0].id]
    );

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    console.error('Token refresh error:', err.message);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const partnerResult = await pool.query(
      'SELECT id, shop_name, status, referral_code, referral_slug, commission_tier FROM pos_partners WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      user: {
        id: req.user.id,
        fullName: req.user.fullName,
        email: req.user.email,
        mobile: req.user.mobile,
        avatarUrl: req.user.avatarUrl,
        roles: req.user.roles,
      },
      partner: partnerResult.rows[0]
        ? {
            id: partnerResult.rows[0].id,
            shopName: partnerResult.rows[0].shop_name,
            status: partnerResult.rows[0].status,
            referralCode: partnerResult.rows[0].referral_code,
            referralSlug: partnerResult.rows[0].referral_slug,
            commissionTier: partnerResult.rows[0].commission_tier,
          }
        : null,
    });
  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// ─── POST /api/auth/logout ──────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Remove all sessions for this user
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [req.user.id]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, ip_address)
       VALUES ($1, 'logout', 'auth', $2)`,
      [req.user.id, req.ip]
    );

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ─── POST /api/auth/pos-login ────────────────────────────────
// POS Partner: login with mobile number + password
router.post('/pos-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Mobile number and password are required' });
    }

    // Support login via mobile or email
    const userResult = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.mobile, u.password_hash, u.is_active, u.mfa_enabled
       FROM users u
       WHERE (u.mobile = $1 OR u.email = $1) AND u.deleted_at IS NULL
       LIMIT 1`,
      [username.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid mobile number or password' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        error: 'No password set for this account. Please contact support or use OTP login.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Log failed attempt
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent, metadata)
         VALUES ($1, 'login_failed', 'auth', $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [user.id, req.ip, req.headers['user-agent'], JSON.stringify({ reason: 'wrong_password' })]
      ).catch(() => {}); // Non-fatal
      return res.status(401).json({ error: 'Invalid mobile number or password' });
    }

    // Check MFA
    if (user.mfa_enabled) {
      const mfaToken = jwt.sign(
        { userId: user.id, mfaPending: true },
        config.jwt.accessSecret,
        { expiresIn: config.jwt.mfaExpiresIn }
      );
      return res.json({ success: true, requiresMfa: true, accessToken: mfaToken });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store session
    await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token, device_info, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken, JSON.stringify({}), req.ip, req.headers['user-agent']]
    );

    // Update last login
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Get partner data
    const partnerResult = await pool.query(
      'SELECT id, shop_name, status, referral_code, referral_slug, commission_tier FROM pos_partners WHERE user_id = $1',
      [user.id]
    );

    // Get roles
    const rolesResult = await pool.query(
      'SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1',
      [user.id]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent)
       VALUES ($1, 'login', 'auth', $2, $3)`,
      [user.id, req.ip, req.headers['user-agent']]
    ).catch(() => {});

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        roles: rolesResult.rows.map((r) => r.name),
      },
      partner: partnerResult.rows[0]
        ? {
            id: partnerResult.rows[0].id,
            shopName: partnerResult.rows[0].shop_name,
            status: partnerResult.rows[0].status,
            referralCode: partnerResult.rows[0].referral_code,
            referralSlug: partnerResult.rows[0].referral_slug,
            commissionTier: partnerResult.rows[0].commission_tier,
          }
        : null,
    });
  } catch (err) {
    console.error('POS login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── POST /api/auth/pos-change-password ──────────────────────
// POS Partner: change their password
router.post('/pos-change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Fetch current hash
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const { password_hash } = result.rows[0];

    if (!password_hash) {
      // First time setting a password
      const newHash = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        newHash,
        req.user.id,
      ]);
      return res.json({ success: true, message: 'Password set successfully' });
    }

    const isMatch = await bcrypt.compare(currentPassword, password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      newHash,
      req.user.id,
    ]);

    // Invalidate all other sessions (force re-login on other devices)
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [req.user.id]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, ip_address)
       VALUES ($1, 'change_password', 'auth', $2)`,
      [req.user.id, req.ip]
    ).catch(() => {});

    res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ─── POST /api/auth/forgot-password ─────────────────────────
// Request a password-reset OTP (public — no auth required)
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Mobile number or email is required' });
    }

    const trimmed = identifier.trim();

    // Look up user by mobile or email
    const userResult = await pool.query(
      `SELECT id, full_name, mobile, email FROM users
       WHERE (mobile = $1 OR email = $1) AND deleted_at IS NULL
       LIMIT 1`,
      [trimmed]
    );

    // Always return success to prevent account enumeration
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with this mobile/email, an OTP has been sent.',
        expiresIn: config.otp.expiresInMinutes * 60,
      });
    }

    const user = userResult.rows[0];

    // Rate limit — max 5 reset OTPs per 15 min
    const recentOtps = await pool.query(
      `SELECT COUNT(*) as count FROM otp_logs
       WHERE (mobile = $1 OR user_id = $2) AND otp_type = 'password_reset'
         AND created_at > NOW() - INTERVAL '15 minutes'`,
      [user.mobile, user.id]
    );

    if (parseInt(recentOtps.rows[0].count) >= config.rateLimit.otpMax) {
      return res.status(429).json({ error: 'Too many reset requests. Please try again later.' });
    }

    // Generate OTP
    const otp = generateOtp(config.otp.length);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + config.otp.expiresInMinutes * 60000);

    // Store OTP
    await pool.query(
      `INSERT INTO otp_logs (mobile, user_id, otp_hash, otp_type, expires_at)
       VALUES ($1, $2, $3, 'password_reset', $4)`,
      [user.mobile, user.id, otpHash, expiresAt]
    );

    // TODO: Send OTP via SMS/email in production
    if (config.server.env === 'development') {
      console.log(`\n🔑 Password Reset OTP for ${trimmed}: ${otp}\n`);
    }

    res.json({
      success: true,
      message: 'If an account exists with this mobile/email, an OTP has been sent.',
      expiresIn: config.otp.expiresInMinutes * 60,
      // Only include OTP in development for testing
      ...(config.server.env === 'development' && { _devOtp: otp }),
    });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// ─── POST /api/auth/verify-reset-otp ────────────────────────
// Verify OTP and issue a short-lived password-reset token
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Mobile/email and OTP are required' });
    }

    const trimmed = identifier.trim();

    // Find user
    const userResult = await pool.query(
      `SELECT id, mobile FROM users
       WHERE (mobile = $1 OR email = $1) AND deleted_at IS NULL
       LIMIT 1`,
      [trimmed]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid OTP or account not found' });
    }

    const user = userResult.rows[0];

    // Find latest unused reset OTP for this user
    const otpResult = await pool.query(
      `SELECT * FROM otp_logs
       WHERE user_id = $1 AND otp_type = 'password_reset' AND verified_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    const otpRecord = otpResult.rows[0];

    // Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts
    if (otpRecord.attempts >= (otpRecord.max_attempts || config.otp.maxAttempts)) {
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

    if (!isValid) {
      await pool.query(
        'UPDATE otp_logs SET attempts = attempts + 1 WHERE id = $1',
        [otpRecord.id]
      );
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // Mark OTP as verified
    await pool.query(
      'UPDATE otp_logs SET verified_at = NOW() WHERE id = $1',
      [otpRecord.id]
    );

    // Issue a short-lived reset token (10 minutes)
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      config.jwt.accessSecret,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken,
    });
  } catch (err) {
    console.error('Verify reset OTP error:', err.message);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// ─── POST /api/auth/reset-password ──────────────────────────
// Reset password using a valid reset token
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Reset token, new password, and confirmation are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, config.jwt.accessSecret);
    } catch (tokenErr) {
      if (tokenErr.name === 'TokenExpiredError') {
        return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
      }
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password
    const updateResult = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING id',
      [newHash, decoded.userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Invalidate all existing sessions
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [decoded.userId]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, ip_address)
       VALUES ($1, 'password_reset', 'auth', $2)`,
      [decoded.userId, req.ip]
    ).catch(() => {}); // Non-fatal

    res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// ─── POST /api/auth/forgot-password ─────────────────────────
// Request a password-reset OTP (public — no auth required)
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Mobile number or email is required' });
    }

    const trimmed = identifier.trim();

    // Look up user by mobile or email
    const userResult = await pool.query(
      `SELECT id, full_name, mobile, email FROM users
       WHERE (mobile = $1 OR email = $1) AND deleted_at IS NULL
       LIMIT 1`,
      [trimmed]
    );

    // Always return success to prevent account enumeration
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with this mobile/email, an OTP has been sent.',
        expiresIn: config.otp.expiresInMinutes * 60,
      });
    }

    const user = userResult.rows[0];

    // Rate limit — max 5 reset OTPs per 15 min
    const recentOtps = await pool.query(
      `SELECT COUNT(*) as count FROM otp_logs
       WHERE (mobile = $1 OR user_id = $2) AND otp_type = 'password_reset'
         AND created_at > NOW() - INTERVAL '15 minutes'`,
      [user.mobile, user.id]
    );

    if (parseInt(recentOtps.rows[0].count) >= config.rateLimit.otpMax) {
      return res.status(429).json({ error: 'Too many reset requests. Please try again later.' });
    }

    // Generate OTP
    const otp = generateOtp(config.otp.length);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + config.otp.expiresInMinutes * 60000);

    // Store OTP
    await pool.query(
      `INSERT INTO otp_logs (mobile, user_id, otp_hash, otp_type, expires_at)
       VALUES ($1, $2, $3, 'password_reset', $4)`,
      [user.mobile, user.id, otpHash, expiresAt]
    );

    // TODO: Send OTP via SMS/email in production
    if (config.server.env === 'development') {
      console.log(`\n🔑 Password Reset OTP for ${trimmed}: ${otp}\n`);
    }

    res.json({
      success: true,
      message: 'If an account exists with this mobile/email, an OTP has been sent.',
      expiresIn: config.otp.expiresInMinutes * 60,
      // Only include OTP in development for testing
      ...(config.server.env === 'development' && { _devOtp: otp }),
    });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// ─── POST /api/auth/verify-reset-otp ────────────────────────
// Verify OTP and issue a short-lived password-reset token
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Mobile/email and OTP are required' });
    }

    const trimmed = identifier.trim();

    // Find user
    const userResult = await pool.query(
      `SELECT id, mobile FROM users
       WHERE (mobile = $1 OR email = $1) AND deleted_at IS NULL
       LIMIT 1`,
      [trimmed]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid OTP or account not found' });
    }

    const user = userResult.rows[0];

    // Find latest unused reset OTP for this user
    const otpResult = await pool.query(
      `SELECT * FROM otp_logs
       WHERE user_id = $1 AND otp_type = 'password_reset' AND verified_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    const otpRecord = otpResult.rows[0];

    // Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts
    if (otpRecord.attempts >= (otpRecord.max_attempts || config.otp.maxAttempts)) {
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

    if (!isValid) {
      await pool.query(
        'UPDATE otp_logs SET attempts = attempts + 1 WHERE id = $1',
        [otpRecord.id]
      );
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // Mark OTP as verified
    await pool.query(
      'UPDATE otp_logs SET verified_at = NOW() WHERE id = $1',
      [otpRecord.id]
    );

    // Issue a short-lived reset token (10 minutes)
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      config.jwt.accessSecret,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken,
    });
  } catch (err) {
    console.error('Verify reset OTP error:', err.message);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// ─── POST /api/auth/reset-password ──────────────────────────
// Reset password using a valid reset token
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Reset token, new password, and confirmation are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, config.jwt.accessSecret);
    } catch (tokenErr) {
      if (tokenErr.name === 'TokenExpiredError') {
        return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
      }
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password
    const updateResult = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING id',
      [newHash, decoded.userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Invalidate all existing sessions
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [decoded.userId]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, ip_address)
       VALUES ($1, 'password_reset', 'auth', $2)`,
      [decoded.userId, req.ip]
    ).catch(() => {}); // Non-fatal

    res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
