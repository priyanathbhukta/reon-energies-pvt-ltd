import { Router } from 'express';
import pool from '../config/database.js';
import { authenticate, requirePermission } from '../middlewares/auth.js';

const router = Router();

// ─── GET /api/leads ─────────────────────────────────────────
// List leads — POS partners see their own, admins see all
router.get('/', authenticate, async (req, res) => {
  try {
    const { stage, priority, source, search, page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;
    const offset = (page - 1) * limit;
    const isAdmin = req.user.roles.includes('super_admin') || req.user.roles.includes('sales_manager');

    let query = `
      SELECT l.*, pp.shop_name as partner_shop_name, u.full_name as assigned_name,
             COUNT(*) OVER() as total_count
      FROM leads l
      LEFT JOIN pos_partners pp ON l.partner_id = pp.id
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.deleted_at IS NULL
    `;
    const params = [];
    let paramIdx = 1;

    // POS partners only see their own leads
    if (!isAdmin) {
      const partnerResult = await pool.query(
        'SELECT id FROM pos_partners WHERE user_id = $1',
        [req.user.id]
      );
      if (partnerResult.rows.length === 0) {
        return res.json({ leads: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      }
      query += ` AND l.partner_id = $${paramIdx++}`;
      params.push(partnerResult.rows[0].id);
    }

    if (stage) {
      query += ` AND l.stage = $${paramIdx++}`;
      params.push(stage);
    }
    if (priority) {
      query += ` AND l.priority = $${paramIdx++}`;
      params.push(priority);
    }
    if (source) {
      query += ` AND l.source = $${paramIdx++}`;
      params.push(source);
    }
    if (search) {
      query += ` AND (l.customer_name ILIKE $${paramIdx} OR l.mobile ILIKE $${paramIdx} OR l.address ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const validSorts = ['created_at', 'customer_name', 'stage', 'estimated_kw', 'electricity_bill_amount'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY l.${sortCol} ${sortOrder} LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const totalCount = result.rows[0]?.total_count || 0;

    res.json({
      leads: result.rows.map((r) => ({
        id: r.id,
        customerName: r.customer_name,
        mobile: r.mobile,
        email: r.email,
        address: r.address,
        state: r.state,
        district: r.district,
        electricityBillAmount: parseFloat(r.electricity_bill_amount) || 0,
        roofType: r.roof_type,
        propertyType: r.property_type,
        estimatedKw: parseFloat(r.estimated_kw) || 0,
        source: r.source,
        stage: r.stage,
        priority: r.priority,
        partnerShopName: r.partner_shop_name,
        assignedTo: r.assigned_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      pagination: {
        total: parseInt(totalCount),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    console.error('List leads error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// ─── POST /api/leads ────────────────────────────────────────
// Create a new lead
router.post('/', authenticate, requirePermission('leads.create'), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customerName, mobile, email, address, state, district, pincode,
      latitude, longitude, electricityBillAmount, roofType, propertyType,
      estimatedKw, source, priority,
    } = req.body;

    if (!customerName || !mobile) {
      return res.status(400).json({ error: 'Customer name and mobile are required' });
    }

    await client.query('BEGIN');

    // Get partner ID for POS partners
    let partnerId = null;
    if (req.user.roles.includes('pos_partner')) {
      const partnerResult = await client.query(
        'SELECT id FROM pos_partners WHERE user_id = $1',
        [req.user.id]
      );
      if (partnerResult.rows.length > 0) {
        partnerId = partnerResult.rows[0].id;
      }
    }

    const result = await client.query(
      `INSERT INTO leads (
        partner_id, customer_name, mobile, email, address, state, district, pincode,
        latitude, longitude, electricity_bill_amount, roof_type, property_type,
        estimated_kw, source, priority, stage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'new')
      RETURNING *`,
      [
        partnerId, customerName, mobile, email, address, state, district, pincode,
        latitude, longitude, electricityBillAmount, roofType, propertyType,
        estimatedKw, source || 'pos_partner', priority || 'medium',
      ]
    );

    const lead = result.rows[0];

    // Create initial status history
    await client.query(
      `INSERT INTO lead_status_history (lead_id, to_stage, changed_by, notes)
       VALUES ($1, 'new', $2, 'Lead created')`,
      [lead.id, req.user.id]
    );

    // Audit
    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, new_data)
       VALUES ($1, 'create_lead', 'leads', $2, $3)`,
      [req.user.id, lead.id, JSON.stringify({ customerName, mobile })]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      lead: {
        id: lead.id,
        customerName: lead.customer_name,
        mobile: lead.mobile,
        stage: lead.stage,
        createdAt: lead.created_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create lead error:', err.message);
    res.status(500).json({ error: 'Failed to create lead' });
  } finally {
    client.release();
  }
});

// ─── GET /api/leads/:id ─────────────────────────────────────
// Get lead detail with timeline
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const leadResult = await pool.query(
      `SELECT l.*, pp.shop_name as partner_shop_name, u.full_name as assigned_name
       FROM leads l
       LEFT JOIN pos_partners pp ON l.partner_id = pp.id
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id = $1 AND l.deleted_at IS NULL`,
      [id]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get status history
    const history = await pool.query(
      `SELECT lsh.*, u.full_name as changed_by_name
       FROM lead_status_history lsh
       LEFT JOIN users u ON lsh.changed_by = u.id
       WHERE lsh.lead_id = $1 ORDER BY lsh.created_at DESC`,
      [id]
    );

    // Get notes
    const notes = await pool.query(
      `SELECT ln.*, u.full_name as author_name
       FROM lead_notes ln
       LEFT JOIN users u ON ln.user_id = u.id
       WHERE ln.lead_id = $1 ORDER BY ln.created_at DESC`,
      [id]
    );

    // Get attachments
    const attachments = await pool.query(
      'SELECT * FROM lead_attachments WHERE lead_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get site visits
    const visits = await pool.query(
      `SELECT sv.*, u.full_name as visitor_name
       FROM site_visits sv
       LEFT JOIN users u ON sv.visited_by = u.id
       WHERE sv.lead_id = $1 ORDER BY sv.scheduled_date DESC`,
      [id]
    );

    const lead = leadResult.rows[0];

    res.json({
      lead: {
        id: lead.id,
        customerName: lead.customer_name,
        mobile: lead.mobile,
        email: lead.email,
        address: lead.address,
        state: lead.state,
        district: lead.district,
        latitude: lead.latitude,
        longitude: lead.longitude,
        electricityBillAmount: parseFloat(lead.electricity_bill_amount) || 0,
        roofType: lead.roof_type,
        propertyType: lead.property_type,
        estimatedKw: parseFloat(lead.estimated_kw) || 0,
        source: lead.source,
        stage: lead.stage,
        priority: lead.priority,
        partnerShopName: lead.partner_shop_name,
        assignedTo: lead.assigned_name,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
      },
      timeline: history.rows,
      notes: notes.rows,
      attachments: attachments.rows,
      siteVisits: visits.rows,
    });
  } catch (err) {
    console.error('Get lead error:', err.message);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// ─── PATCH /api/leads/:id/stage ─────────────────────────────
// Update lead stage
router.patch('/:id/stage', authenticate, requirePermission('leads.update'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;

    const validStages = ['new', 'contacted', 'site_visit_scheduled', 'quotation_sent', 'negotiation', 'converted', 'lost'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    await client.query('BEGIN');

    // Get current stage
    const current = await client.query('SELECT stage, partner_id FROM leads WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lead not found' });
    }

    const fromStage = current.rows[0].stage;
    const partnerId = current.rows[0].partner_id;

    // Update lead
    const updateFields = { stage };
    if (stage === 'converted') updateFields.converted_at = new Date();

    await client.query(
      `UPDATE leads SET stage = $1, converted_at = $2 WHERE id = $3`,
      [stage, stage === 'converted' ? new Date() : null, id]
    );

    // Add to history
    await client.query(
      `INSERT INTO lead_status_history (lead_id, from_stage, to_stage, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, fromStage, stage, req.user.id, notes]
    );

    // If converted, auto-calculate commission
    if (stage === 'converted' && partnerId) {
      const lead = await client.query('SELECT estimated_kw FROM leads WHERE id = $1', [id]);
      const kw = parseFloat(lead.rows[0]?.estimated_kw) || 0;

      // Find applicable commission tier
      const tier = await client.query(
        `SELECT * FROM commission_tiers
         WHERE is_active = true AND type = 'fixed_per_kw'
           AND (min_kw IS NULL OR $1 >= min_kw)
           AND (max_kw IS NULL OR $1 <= max_kw)
         ORDER BY rate DESC LIMIT 1`,
        [kw]
      );

      if (tier.rows.length > 0) {
        const amount = kw * parseFloat(tier.rows[0].rate);

        // Create commission record
        await client.query(
          `INSERT INTO commissions (partner_id, lead_id, tier_id, amount, kw_installed, status, calculation_details)
           VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
          [partnerId, id, tier.rows[0].id, amount, kw,
           JSON.stringify({ kw, rate: tier.rows[0].rate, tierName: tier.rows[0].name })]
        );

        // Credit wallet
        const wallet = await client.query(
          'SELECT id, balance FROM wallets WHERE partner_id = $1',
          [partnerId]
        );

        if (wallet.rows.length > 0) {
          const newBalance = parseFloat(wallet.rows[0].balance) + amount;
          await client.query(
            'UPDATE wallets SET balance = $1, total_earned = total_earned + $2 WHERE id = $3',
            [newBalance, amount, wallet.rows[0].id]
          );

          await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
             VALUES ($1, 'credit', $2, $3, 'commission', $4, $5)`,
            [wallet.rows[0].id, amount, newBalance, id,
             `Commission for ${kw} kW installation`]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Lead stage updated to ${stage}` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update stage error:', err.message);
    res.status(500).json({ error: 'Failed to update stage' });
  } finally {
    client.release();
  }
});

// ─── POST /api/leads/:id/notes ──────────────────────────────
router.post('/:id/notes', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isInternal } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const result = await pool.query(
      `INSERT INTO lead_notes (lead_id, user_id, content, is_internal)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.user.id, content, isInternal || false]
    );

    res.status(201).json({
      success: true,
      note: result.rows[0],
    });
  } catch (err) {
    console.error('Add note error:', err.message);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// ─── GET /api/leads/stats ───────────────────────────────────
// Dashboard stats for leads
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.roles.includes('super_admin') || req.user.roles.includes('sales_manager');

    let partnerFilter = '';
    const params = [];

    if (!isAdmin) {
      const partner = await pool.query('SELECT id FROM pos_partners WHERE user_id = $1', [req.user.id]);
      if (partner.rows.length > 0) {
        partnerFilter = 'AND partner_id = $1';
        params.push(partner.rows[0].id);
      }
    }

    const totalLeads = await pool.query(
      `SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL ${partnerFilter}`,
      params
    );

    const stageBreakdown = await pool.query(
      `SELECT stage, COUNT(*) as count FROM leads WHERE deleted_at IS NULL ${partnerFilter} GROUP BY stage`,
      params
    );

    const monthlyLeads = await pool.query(
      `SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
       FROM leads WHERE deleted_at IS NULL ${partnerFilter}
       AND created_at > NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month`,
      params
    );

    res.json({
      total: parseInt(totalLeads.rows[0]?.count || 0),
      byStage: stageBreakdown.rows.reduce((acc, r) => ({ ...acc, [r.stage]: parseInt(r.count) }), {}),
      monthly: monthlyLeads.rows,
    });
  } catch (err) {
    console.error('Lead stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
