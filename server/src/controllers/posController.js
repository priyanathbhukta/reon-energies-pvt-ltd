import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import pool from '../config/database.js';
import { authenticate, requireRole, requirePermission } from '../middlewares/auth.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// ─── Helper: Generate referral code ─────────────────────────
function generateReferralCode() {
  return 'REON-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generateSlug(shopName, fullName) {
  const base = (shopName || fullName)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  const suffix = crypto.randomBytes(2).toString('hex');
  return `${base}-${suffix}`;
}

// ─── POST /api/pos/register ─────────────────────────────────
// Register a new POS partner (public — no KYC/bank details required online)
// Confidential documents (Aadhaar, PAN, Bank) are submitted physically at onboarding.
router.post('/register', async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      fullName, mobile, email, password,
      shopName, gstNumber, address, state, district, pincode,
      referredByCode, ref,
    } = req.body;

    const incomingReferralCode = (referredByCode || ref || '').toString().trim().toUpperCase() || null;

    // ── Validation ──────────────────────────────────────────
    if (!fullName || !mobile || !email || !password || !shopName || !address || !state || !district) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    if (mobile.length !== 10 || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      });
    }

    await client.query('BEGIN');

    // ── Check duplicates ────────────────────────────────────
    const existingUser = await client.query(
      'SELECT id FROM users WHERE (mobile = $1 OR email = $2) AND deleted_at IS NULL',
      [mobile, email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with this mobile number or email already exists' });
    }

    // ── Hash password ───────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ── Create user ─────────────────────────────────────────
    const userResult = await client.query(
      `INSERT INTO users (full_name, mobile, email, password_hash, is_mobile_verified, is_active)
       VALUES ($1, $2, $3, $4, true, true) RETURNING id`,
      [fullName.trim(), mobile, email.toLowerCase().trim(), passwordHash]
    );
    const userId = userResult.rows[0].id;

    // ── Assign POS partner role ─────────────────────────────
    const roleResult = await client.query("SELECT id FROM roles WHERE name = 'pos_partner'");
    if (roleResult.rows.length > 0) {
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [userId, roleResult.rows[0].id]
      );
    }

    // ── Create partner profile ──────────────────────────────
    const referralCode = generateReferralCode();
    const referralSlug = generateSlug(shopName, fullName);

    const partnerResult = await client.query(
      `INSERT INTO pos_partners
         (user_id, pos_id, shop_name, gst_number, address, state, district, pincode, referral_code, referral_slug, referred_by_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
       RETURNING id`,
      [userId, mobile, shopName.trim(), gstNumber || null, address.trim(), state.trim(), district.trim(), pincode || null, referralCode, referralSlug, incomingReferralCode]
    );
    const partnerId = partnerResult.rows[0].id;

    // ── Create wallet ───────────────────────────────────────
    await client.query('INSERT INTO wallets (partner_id) VALUES ($1)', [partnerId]);

    // ── Create referral link ────────────────────────────────
    await client.query(
      'INSERT INTO referral_links (partner_id, slug) VALUES ($1, $2)',
      [partnerId, referralSlug]
    );

    // ── Notify admins ───────────────────────────────────────
    const admins = await client.query(
      `SELECT u.id FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name IN ('super_admin', 'sales_manager') AND u.deleted_at IS NULL`
    );

    for (const admin of admins.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, data)
         VALUES ($1, 'New POS Partner Registered', $2, 'kyc', $3)`,
        [
          admin.id,
          `${fullName} (${shopName}) has registered as a POS partner and requires physical onboarding.`,
          JSON.stringify({ partnerId, shopName, state, district, mobile }),
        ]
      );
    }

    // ── Audit log ───────────────────────────────────────────
    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address)
       VALUES ($1, 'register', 'pos_partners', $2, $3)`,
      [userId, partnerId, req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Registration successful! Our team will contact you within 24–48 hours to schedule your onboarding appointment.',
      partner: {
        id: partnerId,
        posId: mobile,
        referralCode,
        referralSlug,
        status: 'pending',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Partner registration error:', err.message);

    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this mobile or email already exists' });
    }

    res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    client.release();
  }
});

// ─── GET /api/pos/partners ──────────────────────────────────
// Admin: List all partners with filters
router.get('/partners', authenticate, requirePermission('partners.read'), async (req, res) => {
  try {
    const { status, state, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT pp.*, u.full_name, u.email, u.mobile, u.avatar_url,
             COUNT(*) OVER() as total_count
      FROM pos_partners pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.deleted_at IS NULL
    `;
    const params = [];
    let paramIdx = 1;

    if (status) {
      query += ` AND pp.status = $${paramIdx++}`;
      params.push(status);
    }
    if (state) {
      query += ` AND pp.state = $${paramIdx++}`;
      params.push(state);
    }
    if (search) {
      query += ` AND (u.full_name ILIKE $${paramIdx} OR pp.shop_name ILIKE $${paramIdx} OR u.mobile ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ` ORDER BY pp.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    const totalCount = result.rows[0]?.total_count || 0;

    res.json({
      partners: result.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        fullName: r.full_name,
        email: r.email,
        mobile: r.mobile,
        shopName: r.shop_name,
        state: r.state,
        district: r.district,
        status: r.status,
        referralCode: r.referral_code,
        commissionTier: r.commission_tier,
        createdAt: r.created_at,
      })),
      pagination: {
        total: parseInt(totalCount),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    console.error('List partners error:', err.message);
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

// ─── GET /api/pos/partners/:id/details ──────────────────────
// Admin: Get a 360-degree view of a POS partner
router.get('/partners/:id/details', authenticate, requirePermission('partners.read'), async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Basic Partner Info
    const partnerResult = await pool.query(
      `SELECT pp.*, u.full_name, u.email, u.mobile, u.avatar_url 
       FROM pos_partners pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.id = $1`,
      [id]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const partner = partnerResult.rows[0];

    // 2. Bank Details
    const bankResult = await pool.query(
      'SELECT * FROM partner_bank_details WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );
    partner.bankDetails = bankResult.rows[0] || null;

    // 3. Documents
    const docsResult = await pool.query(
      'SELECT id, document_type, document_name, verification_status, created_at FROM partner_documents WHERE partner_id = $1',
      [id]
    );
    partner.documents = docsResult.rows;

    // 4. Leads & Stats
    const statsResult = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM leads WHERE partner_id = $1) as total_leads,
        (SELECT balance FROM wallets WHERE partner_id = $1) as wallet_balance,
        (SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE partner_id = $1 AND status = 'paid') as total_earnings`,
      [id]
    );
    
    partner.stats = statsResult.rows[0];

    res.json({ success: true, partner });
  } catch (err) {
    console.error('Get partner details error:', err.message);
    res.status(500).json({ error: 'Failed to fetch partner details' });
  }
});

// ─── PATCH /api/pos/partners/:id/approve ────────────────────
router.patch('/partners/:id/approve', authenticate, requirePermission('partners.approve'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE pos_partners SET status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE id = $2 AND status = 'pending' RETURNING user_id, shop_name`,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Partner not found or already processed' });
    }

    // Notify partner
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Account Approved! 🎉', 'Congratulations! Your POS partner account has been approved. You can now start adding leads.', 'system')`,
      [result.rows[0].user_id]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id)
       VALUES ($1, 'approve_partner', 'pos_partners', $2)`,
      [req.user.id, id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Partner approved successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approve partner error:', err.message);
    res.status(500).json({ error: 'Failed to approve partner' });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/pos/partners/:id/reject ─────────────────────
router.patch('/partners/:id/reject', authenticate, requirePermission('partners.approve'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE pos_partners SET status = 'rejected', rejection_reason = $1
       WHERE id = $2 AND status = 'pending' RETURNING user_id`,
      [reason || 'Application rejected', id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Partner not found or already processed' });
    }

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, data)
       VALUES ($1, 'Application Update', $2, 'kyc', $3)`,
      [result.rows[0].user_id, `Your POS partner application was not approved. Reason: ${reason || 'Not specified'}`, JSON.stringify({ reason })]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Partner rejected' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reject partner error:', err.message);
    res.status(500).json({ error: 'Failed to reject partner' });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/pos/partners/:id/suspend ────────────────────
router.patch('/partners/:id/suspend', authenticate, requirePermission('partners.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await pool.query(
      `UPDATE pos_partners SET status = 'suspended', rejection_reason = $1
       WHERE id = $2 AND status = 'approved'`,
      [reason || 'Account suspended', id]
    );

    res.json({ success: true, message: 'Partner suspended' });
  } catch (err) {
    console.error('Suspend partner error:', err.message);
    res.status(500).json({ error: 'Failed to suspend partner' });
  }
});

// ─── GET /api/pos/profile ───────────────────────────────────
// Get full profile of the logged-in POS partner
router.get('/profile', authenticate, async (req, res) => {
  try {
    const partnerResult = await pool.query(
      `SELECT pp.*, u.full_name, u.email, u.mobile, u.avatar_url 
       FROM pos_partners pp 
       JOIN users u ON pp.user_id = u.id 
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Partner profile not found' });
    }
    
    const partner = partnerResult.rows[0];

    // Fetch bank details
    const bankResult = await pool.query(
      'SELECT * FROM partner_bank_details WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 1',
      [partner.id]
    );
    partner.bankDetails = bankResult.rows[0] || null;

    // Fetch documents
    const docsResult = await pool.query(
      'SELECT id, document_type, document_name, verification_status, created_at FROM partner_documents WHERE partner_id = $1',
      [partner.id]
    );
    partner.documents = docsResult.rows;

    res.json({ success: true, partner });
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ─── Helper: Validate UUID ─────────────────────────────────
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (val) => typeof val === 'string' && uuidRegex.test(val);

// ─── GET /api/pos/referrals ──────────────────────────────────
// POS Partner: Get partner referral info, link, and list of referred partner businesses
router.get('/referrals', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    let partnerRes = { rows: [] };
    if (isValidUuid(userId)) {
      partnerRes = await pool.query(
        'SELECT id, shop_name, referral_code, referral_slug FROM pos_partners WHERE user_id = $1',
        [userId]
      );
    }

    if (partnerRes.rows.length === 0) {
      // Fallback: check if id is partner id directly
      if (isValidUuid(userId)) {
        partnerRes = await pool.query(
          'SELECT id, shop_name, referral_code, referral_slug FROM pos_partners WHERE id = $1',
          [userId]
        );
      }
    }

    const partner = partnerRes.rows[0];
    const referralCode = partner?.referral_code || (partner?.id ? 'REON-' + partner.id.slice(0, 6).toUpperCase() : 'REON-PARTNER');
    const referralLink = `https://pos.reonenergy.in/register?ref=${referralCode}`;

    // Fetch partners registered using this referral code
    const referredPartnersRes = await pool.query(
      `SELECT pp.id, pp.shop_name, pp.state, pp.district, pp.status, pp.created_at, u.full_name
       FROM pos_partners pp
       LEFT JOIN users u ON pp.user_id = u.id
       WHERE pp.referred_by_code = $1 AND pp.deleted_at IS NULL
       ORDER BY pp.created_at DESC`,
      [referralCode]
    );

    const referredPartners = referredPartnersRes.rows.map((r) => ({
      id: r.id,
      shopName: r.shop_name || 'Retail Partner',
      ownerName: r.full_name || 'Store Owner',
      location: [r.district, r.state].filter(Boolean).join(', ') || 'India',
      status: r.status,
      dateJoined: r.created_at,
      reward: r.status === 'active' ? '₹1,000 Credited' : 'Pending Activation',
      isConverted: r.status === 'active',
    }));

    const totalReferrals = referredPartners.length;
    const successfulConversions = referredPartners.filter((p) => p.isConverted).length;
    const totalEarnings = successfulConversions * 1000;

    res.json({
      success: true,
      referralCode,
      referralLink,
      stats: {
        totalReferrals,
        successfulConversions,
        totalEarnings,
      },
      referredPartners,
    });
  } catch (err) {
    console.error('POS referrals error:', err.message);
    res.status(500).json({ error: 'Failed to fetch referral data' });
  }
});

// ─── GET /api/pos/dashboard-stats or /api/v2/pos/dashboard-stats ──
router.get('/dashboard-stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const isSuperAdmin = req.user.roles && (req.user.roles.includes('super_admin') || req.user.roles.includes('sales_manager'));

    // Check if partner exists for this user (safely checking UUID format)
    let partnerRes = { rows: [] };
    if (isValidUuid(userId)) {
      partnerRes = await pool.query(
        'SELECT id, shop_name, referral_code, user_id FROM pos_partners WHERE user_id = $1',
        [userId]
      );
    }

    let partnerId = partnerRes.rows[0]?.id || null;
    let shopName = partnerRes.rows[0]?.shop_name || null;
    let referralCode = partnerRes.rows[0]?.referral_code || null;

    // If admin requests another partner's stats via query
    if (isSuperAdmin && req.query.partnerId && isValidUuid(req.query.partnerId)) {
      partnerId = req.query.partnerId;
      const targetPartner = await pool.query('SELECT shop_name, referral_code, user_id FROM pos_partners WHERE id = $1', [partnerId]);
      if (targetPartner.rows.length > 0) {
        shopName = targetPartner.rows[0].shop_name;
        referralCode = targetPartner.rows[0].referral_code;
      }
    }

    let filterClause = '';
    const params = [];

    if (partnerId) {
      params.push(partnerId, shopName || '', referralCode || '');
      let userClause = '';
      if (isValidUuid(userId)) {
        params.push(userId);
        userClause = `OR l.user_id = $${params.length}`;
      }
      filterClause = `
        AND (
          l.partner_id = $1 
          OR (l.pos_name IS NOT NULL AND l.pos_name = $2)
          OR (l.pos_id IS NOT NULL AND l.pos_id = $3)
          ${userClause}
        )
      `;
    } else if (!isSuperAdmin) {
      return res.json({
        success: true,
        partner: null,
        stats: {
          totalLeads: 0,
          pendingLeads: 0,
          convertedLeads: 0,
          conversionRate: 0,
          totalQuotationValue: 0,
          convertedBusinessValue: 0,
        },
        leads: [],
      });
    }

    const query = `
      SELECT 
        l.id,
        l.customer_name AS "customerName",
        l.mobile AS "contactNumber",
        l.email,
        l.address,
        COALESCE(l.quotation_no, q.offer_no) AS "quotationNumber",
        COALESCE(l.quotation_date, q.created_at, l.created_at) AS "quotationDate",
        COALESCE(l.quotation_amount, q.total_price, 0)::numeric AS "quotationAmount",
        COALESCE(l.lead_status, CASE WHEN l.stage = 'converted' THEN 'Converted' ELSE 'Pending' END) AS "leadStatus",
        COALESCE(l.invoice_no, i.invoice_no) AS "invoiceNumber",
        COALESCE(l.converted_at, i.created_at) AS "conversionDate",
        COALESCE(l.invoice_amount, i.grand_total, 0)::numeric AS "invoiceAmount",
        l.created_at AS "createdAt",
        l.stage
      FROM leads l
      LEFT JOIN quotations q ON l.quotation_id = q.id
      LEFT JOIN invoices i ON l.invoice_id = i.id
      WHERE l.deleted_at IS NULL ${filterClause}
      ORDER BY l.created_at DESC;
    `;

    const leadsResult = await pool.query(query, params);
    const leads = leadsResult.rows;

    const totalLeads = leads.length;
    const convertedLeads = leads.filter(
      (l) => l.leadStatus === 'Converted' || l.stage === 'converted' || l.invoiceNumber
    ).length;
    const pendingLeads = totalLeads - convertedLeads;
    const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;
    const totalQuotationValue = leads.reduce((acc, l) => acc + (parseFloat(l.quotationAmount) || 0), 0);
    const convertedBusinessValue = leads
      .filter((l) => l.leadStatus === 'Converted' || l.stage === 'converted' || l.invoiceNumber)
      .reduce((acc, l) => acc + (parseFloat(l.invoiceAmount) || 0), 0);

    res.json({
      success: true,
      partner: partnerRes.rows[0] || null,
      stats: {
        totalLeads,
        pendingLeads,
        convertedLeads,
        conversionRate,
        totalQuotationValue,
        convertedBusinessValue,
      },
      leads,
    });
  } catch (err) {
    console.error('POS Dashboard Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ─── PUT /api/pos/settings ──────────────────────────────────
// Update profile settings
router.put('/settings', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { fullName, email, shopName, gstNumber, address, district, state, pincode } = req.body;
    
    await client.query('BEGIN');

    // Update Users table
    await client.query(
      'UPDATE users SET full_name = COALESCE($1, full_name), email = COALESCE($2, email) WHERE id = $3',
      [fullName, email, req.user.id]
    );

    // Update POS Partners table
    await client.query(
      `UPDATE pos_partners 
       SET shop_name = COALESCE($1, shop_name),
           gst_number = COALESCE($2, gst_number),
           address = COALESCE($3, address),
           district = COALESCE($4, district),
           state = COALESCE($5, state),
           pincode = COALESCE($6, pincode),
           updated_at = NOW()
       WHERE user_id = $7`,
      [shopName, gstNumber, address, district, state, pincode, req.user.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update settings error:', err.message);
    res.status(500).json({ error: 'Failed to update settings' });
  } finally {
    client.release();
  }
});

// ─── PUT /api/pos/bank ──────────────────────────────────────
// Update Bank Details
router.put('/bank', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { accountHolderName, accountNumber, ifscCode, bankName, branchName } = req.body;
    
    // Get partner ID
    const partnerResult = await client.query('SELECT id FROM pos_partners WHERE user_id = $1', [req.user.id]);
    if (partnerResult.rows.length === 0) return res.status(404).json({ error: 'Partner not found' });
    const partnerId = partnerResult.rows[0].id;

    await client.query('BEGIN');

    // Upsert logic for bank details
    const existingBank = await client.query('SELECT id FROM partner_bank_details WHERE partner_id = $1', [partnerId]);
    
    if (existingBank.rows.length > 0) {
      await client.query(
        `UPDATE partner_bank_details 
         SET account_holder_name = COALESCE($1, account_holder_name),
             account_number = COALESCE($2, account_number),
             ifsc_code = COALESCE($3, ifsc_code),
             bank_name = COALESCE($4, bank_name),
             branch_name = COALESCE($5, branch_name),
             updated_at = NOW(),
             verified = false
         WHERE partner_id = $6`,
        [accountHolderName, accountNumber, ifscCode, bankName, branchName, partnerId]
      );
    } else {
      await client.query(
        `INSERT INTO partner_bank_details (partner_id, account_holder_name, account_number, ifsc_code, bank_name, branch_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [partnerId, accountHolderName, accountNumber, ifscCode, bankName, branchName]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Bank details updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update bank error:', err.message);
    res.status(500).json({ error: 'Failed to update bank details' });
  } finally {
    client.release();
  }
});

// ─── PUT /api/pos/kyc ───────────────────────────────────────
// Update KYC Details (PAN / Aadhaar numbers)
router.put('/kyc', authenticate, async (req, res) => {
  try {
    const { panNumber, aadhaarNumber } = req.body;
    
    await pool.query(
      `UPDATE pos_partners 
       SET pan_number = COALESCE($1, pan_number),
           aadhaar_number = COALESCE($2, aadhaar_number),
           updated_at = NOW()
       WHERE user_id = $3`,
      [panNumber, aadhaarNumber, req.user.id]
    );

    res.json({ success: true, message: 'KYC details updated successfully' });
  } catch (err) {
    console.error('Update KYC error:', err.message);
    res.status(500).json({ error: 'Failed to update KYC details' });
  }
});

// ─── POST /api/pos/tickets ───────────────────────────────────
// POS Partner raises a ticket for profile update
router.post('/tickets', authenticate, async (req, res) => {
  try {
    const { ticketType, requestedData } = req.body;
    
    const partnerResult = await pool.query('SELECT id FROM pos_partners WHERE user_id = $1', [req.user.id]);
    if (partnerResult.rows.length === 0) {
      return res.status(404).json({ error: 'POS Partner profile not found' });
    }
    const partnerId = partnerResult.rows[0].id;

    await pool.query(
      `INSERT INTO pos_tickets (partner_id, ticket_type, requested_data)
       VALUES ($1, $2, $3)`,
      [partnerId, ticketType, JSON.stringify(requestedData)]
    );

    res.json({ success: true, message: 'Ticket raised successfully' });
  } catch (err) {
    console.error('Create ticket error:', err.message);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// ─── GET /api/pos/tickets ────────────────────────────────────
// POS Partner gets their tickets
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const partnerResult = await pool.query('SELECT id FROM pos_partners WHERE user_id = $1', [req.user.id]);
    if (partnerResult.rows.length === 0) {
      return res.status(404).json({ error: 'POS Partner profile not found' });
    }
    const partnerId = partnerResult.rows[0].id;

    const ticketsResult = await pool.query(
      'SELECT * FROM pos_tickets WHERE partner_id = $1 ORDER BY created_at DESC',
      [partnerId]
    );

    res.json({ success: true, tickets: ticketsResult.rows });
  } catch (err) {
    console.error('Get tickets error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ─── GET /api/pos/admin/tickets ──────────────────────────────
// Admin views all POS tickets
router.get('/admin/tickets', authenticate, requirePermission('partners.read'), async (req, res) => {
  try {
    const ticketsResult = await pool.query(
      `SELECT t.*, p.shop_name, p.pos_id, u.full_name, u.mobile 
       FROM pos_tickets t
       JOIN pos_partners p ON t.partner_id = p.id
       JOIN users u ON p.user_id = u.id
       ORDER BY t.created_at DESC`
    );
    res.json({ success: true, tickets: ticketsResult.rows });
  } catch (err) {
    console.error('Admin get tickets error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ─── PATCH /api/pos/admin/tickets/:id/status ─────────────────
// Admin approves or rejects a POS ticket
router.patch('/admin/tickets/:id/status', authenticate, requirePermission('partners.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const ticketResult = await pool.query(
      'UPDATE pos_tickets SET status = $1, admin_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, req.user.id, id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // In a full implementation, if approved, we would also merge ticketResult.rows[0].requested_data into pos_partners or other tables.

    res.json({ success: true, message: `Ticket ${status} successfully` });
  } catch (err) {
    console.error('Admin update ticket error:', err.message);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// ─── PUT /api/pos/admin/partners/:id ────────────────────────
router.put('/admin/partners/:id', authenticate, requirePermission('partners.approve'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { fullName, shopName, email, mobile, address, state, district, pincode } = req.body;

    await client.query('BEGIN');

    // Update pos_partners
    await client.query(
      `UPDATE pos_partners 
       SET shop_name = $1, address = $2, state = $3, district = $4, pincode = $5, updated_at = NOW()
       WHERE id = $6`,
      [shopName, address, state, district, pincode, id]
    );

    // Update users (using user_id from pos_partners)
    const partnerRes = await client.query('SELECT user_id FROM pos_partners WHERE id = $1', [id]);
    if (partnerRes.rows.length > 0) {
      const userId = partnerRes.rows[0].user_id;
      await client.query(
        `UPDATE users
         SET full_name = $1, email = $2, mobile = $3, updated_at = NOW()
         WHERE id = $4`,
        [fullName, email, mobile, userId]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'POS Partner updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin update POS partner error:', err.message);
    if (err.constraint === 'users_email_key' || err.constraint === 'users_mobile_key') {
      return res.status(409).json({ error: 'Email or Mobile already in use' });
    }
    res.status(500).json({ error: 'Failed to update POS partner' });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/pos/admin/partners/:id ─────────────────────
router.delete('/admin/partners/:id', authenticate, requirePermission('partners.approve'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // Retrieve user_id from partner profile
    const partnerRes = await client.query('SELECT user_id FROM pos_partners WHERE id = $1', [id]);
    if (partnerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'POS Partner not found' });
    }
    const userId = partnerRes.rows[0].user_id;

    // Soft delete pos_partners
    await client.query('UPDATE pos_partners SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);

    // Soft delete user
    await client.query('UPDATE users SET deleted_at = NOW(), updated_at = NOW(), is_active = false WHERE id = $1', [userId]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'POS Partner deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin delete POS partner error:', err.message);
    res.status(500).json({ error: 'Failed to delete POS partner' });
  } finally {
    client.release();
  }
});

export default router;
