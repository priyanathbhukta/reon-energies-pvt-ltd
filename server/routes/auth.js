import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const router = Router();
const otpStore = new Map();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    res.json({ valid: true, admin: { id: decoded.id, username: decoded.username } });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    
    if (mobile) {
      // POS Login flow
      const otp = '123456'; // Mocked for development
      otpStore.set(mobile, {
        otp,
        expiresAt: new Date(Date.now() + 5 * 60000) // 5 minutes
      });
      console.log(`[DEV] Mock OTP for ${mobile}: ${otp}`);
      return res.json({ success: true, message: 'OTP sent to mobile.' });
    }

    const email = 'support@reonenergy.in';
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    otpStore.set(email, {
      otp,
      expiresAt: new Date(Date.now() + 5 * 60000) // 5 minutes
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"REON Admin" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Admin Dashboard - Action OTP',
      text: `Your OTP for editing/deleting a document is: ${otp}\n\nThis OTP is valid for 5 minutes.`,
      html: `<b>Your OTP for editing/deleting a document is: <span style="font-size:18px; color:#1A8FA0;">${otp}</span></b><br/><br/>This OTP is valid for 5 minutes.`
    });

    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { otp } = req.body;
  const email = 'support@reonenergy.in';
  
  if (!otp) return res.status(400).json({ error: 'OTP is required.' });

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ error: 'No OTP requested or expired.' });

  if (new Date() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP has expired.' });
  }

  if (record.otp === otp) {
    otpStore.delete(email);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid OTP.' });
  }
});

// POST /api/auth/verify-otp-login (POS Partner)
router.post('/verify-otp-login', async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ error: 'Mobile and OTP required.' });

    const record = otpStore.get(mobile);
    if (!record || new Date() > record.expiresAt || record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    otpStore.delete(mobile);

    // Check if user exists
    let userResult = await pool.query('SELECT * FROM users WHERE mobile = $1', [mobile]);
    let user;
    if (userResult.rows.length === 0) {
      // Create new user
      const insertUser = await pool.query(
        'INSERT INTO users (full_name, mobile, is_active) VALUES ($1, $2, true) RETURNING *',
        ['New Partner', mobile]
      );
      user = insertUser.rows[0];
      
      // Create basic pos_partners record
      await pool.query(
        'INSERT INTO pos_partners (user_id, shop_name, referral_code) VALUES ($1, $2, $3)',
        [user.id, 'New Shop', 'REON' + Math.floor(Math.random()*10000)]
      );
    } else {
      user = userResult.rows[0];
    }

    const partnerResult = await pool.query('SELECT * FROM pos_partners WHERE user_id = $1', [user.id]);
    const partner = partnerResult.rows[0] || null;

    const accessToken = jwt.sign({ id: user.id, mobile: user.mobile, type: 'pos' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        roles: ['pos_partner']
      },
      partner: partner ? {
        id: partner.id,
        shopName: partner.shop_name,
        status: partner.status,
        referralCode: partner.referral_code,
        commissionTier: partner.commission_tier
      } : null,
      requiresMfa: false
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

export default router;
