import express from 'express';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import util from 'util';
import pool from '../db.js';

const execFileAsync = util.promisify(execFile);
const router = express.Router();

// ── Helper: resolve the correct public base URL even behind a reverse proxy ──
function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  
  if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    return `${proto}://${host}`;
  }
  
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  return `${proto}://${host}`;
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The Python script wrapper path
const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'run_pdf_gen.py');
// PDF output directory (served as static files)
const PDF_DIR = path.join(__dirname, '..', 'pdfs');

if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

const runPythonCommand = process.platform === 'win32' ? 'python' : 'python3';

// ── Helper: Get current Financial Year (e.g. '26-27') ─────────────────────
export function getCurrentFinancialYear(date = new Date()) {
  const d = new Date(date);
  const month = d.getMonth();
  const year = d.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

// ── Helper: Get next Quotation Number dynamically from DB ──────────────────
export async function getNextQuotationNumber() {
  const fy = getCurrentFinancialYear();
  const query = `SELECT offer_no FROM quotations WHERE offer_no LIKE $1 OR offer_no LIKE $2`;
  const values = [`%/${fy}/%`, `%-${fy}-%`];
  const { rows } = await pool.query(query, values);
  
  let maxSeq = 0;
  for (const row of rows) {
    if (!row.offer_no) continue;
    const match = row.offer_no.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const nextSeqNum = maxSeq + 1;
  const paddedSeq = String(nextSeqNum).padStart(3, '0');
  const nextOfferNo = `REPL/${fy}/${paddedSeq}`;
  return { fy, maxSeq, nextSeqNum, paddedSeq, nextOfferNo };
}

// ── GET /api/admin/quotations/next-number or /api/v2/quotations/next-number ───
router.get('/next-number', async (req, res) => {
  try {
    const info = await getNextQuotationNumber();
    res.json({
      success: true,
      financialYear: info.fy,
      nextSeq: info.paddedSeq,
      nextOfferNo: info.nextOfferNo,
    });
  } catch (err) {
    console.error('Error fetching next quotation number:', err);
    res.status(500).json({ error: 'Failed to fetch next quotation number' });
  }
});

// ── POST /api/admin/quotations or /api/v2/quotations ────────────────────────
router.post('/', async (req, res) => {
  const data = req.body;

  // Dynamic runtime check: Resolve quotation number dynamically from DB if missing/placeholder
  let offerNo = data.offerNo || data.offer_no;
  if (!offerNo || offerNo.includes('NNN') || !data.quotation_no_seq) {
    const info = await getNextQuotationNumber();
    offerNo = info.nextOfferNo;
    data.quotation_no_seq = info.paddedSeq;
    data.offerNo = offerNo;
    data.offer_no = offerNo;
  }

  // PDF filename = quotation number with slashes replaced by dashes
  const pdfFileName = `${offerNo.replace(/\//g, '-')}.pdf`;
  const localPdfPath = path.join(PDF_DIR, pdfFileName);

  try {
    // 1. Generate PDF via Python
    const jsonPayload = JSON.stringify(data);
    console.log(`[PDF] Generating: ${pdfFileName} | payload size: ${jsonPayload.length} bytes`);

    const { stdout, stderr } = await execFileAsync(
      runPythonCommand,
      [SCRIPT_PATH, '--output', localPdfPath],
      {
        env: { ...process.env, REON_QUOTE_JSON: jsonPayload },
        timeout: 60000,             // 60-second limit
        maxBuffer: 5 * 1024 * 1024, // 5 MB stdout/stderr buffer
      }
    );

    if (stderr && stderr.trim()) {
      console.warn('[PDF] Python stderr:', stderr.trim());
    }
    console.log('[PDF] Python stdout:', stdout.trim());

    // 2. Build a URL to download the PDF
    const pdfUrl = `${getBaseUrl(req)}/pdfs/${pdfFileName}`;

    // Read the PDF into base64 to store permanent binary data in database
    let pdfData = null;
    try {
      if (fs.existsSync(localPdfPath)) {
        const fileBuffer = fs.readFileSync(localPdfPath);
        pdfData = fileBuffer.toString('base64');
      }
    } catch (readErr) {
      console.warn('[PDF] Could not convert PDF to base64 for DB storage:', readErr.message);
    }

    // 3. Resolve Creator (POS Partner vs Admin)
    let createdByType = 'admin';
    let posName = 'admin';
    let posId = null;
    let partnerId = null;
    let userId = null;
    let adminId = null;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const rawUserId = req.user?.id || null;
    const rawAdminId = req.admin?.id || null;

    // Check if called by legacy admin (integer ID from admins table)
    if (rawAdminId !== null && !isNaN(Number(rawAdminId))) {
      adminId = parseInt(rawAdminId, 10);
      createdByType = 'admin';
      posName = 'admin';
    }

    // Check if the caller is an authenticated POS partner via req.user (UUID from users table)
    if (rawUserId && uuidRegex.test(String(rawUserId))) {
      userId = String(rawUserId);
      try {
        const partnerRes = await pool.query(
          'SELECT id, shop_name, referral_code FROM pos_partners WHERE user_id = $1',
          [userId]
        );
        if (partnerRes.rows.length > 0) {
          createdByType = 'pos';
          partnerId = partnerRes.rows[0].id;
          posName = partnerRes.rows[0].shop_name || req.user.fullName || 'POS Partner';
          posId = partnerRes.rows[0].referral_code || partnerRes.rows[0].id;
        }
      } catch (pErr) {
        console.warn('[Quotation] Failed to query pos_partners by user_id:', pErr.message);
      }
    }

    // If client explicitly passed partner details or shop name
    if (data.pos_name && data.pos_name.toLowerCase() !== 'admin') {
      createdByType = 'pos';
      posName = data.pos_name;
      posId = data.pos_id || posId;
    }
    if (data.pos_id && !posId) {
      posId = data.pos_id;
    }
    if (data.partner_id && uuidRegex.test(String(data.partner_id))) {
      partnerId = String(data.partner_id);
    }

    // 4. Save to Database
    const {
      customer_name,
      totalCost,
      financeParameters,
    } = data;

    const safeNum = val => parseFloat((val || '').toString().replace(/,/g, '')) || 0;

    const payment_mode   = financeParameters ? 'EMI / Loan' : 'Cash';
    const down_payment   = financeParameters?.downPayment  || 0;
    const loan_amount    = financeParameters?.loanAmount   || 0;
    const interest_rate  = financeParameters?.interestRate || 0;
    const tenure         = financeParameters?.tenure       || 0;
    const emi_amount     = financeParameters?.emiAmount    || 0;
    const total_interest = financeParameters?.totalInterest|| 0;
    const total_emi_paid = financeParameters?.totalPayable || 0;
    const clean_total    = safeNum(totalCost);

    const query = `
      INSERT INTO quotations (
        offer_no, customer_name, total_price, payment_mode,
        down_payment, loan_amount, interest_rate, tenure,
        emi_amount, total_interest, total_emi_paid, pdf_url, raw_data,
        pos_name, pos_id, created_by_type, pdf_data, user_id, partner_id, admin_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING id, offer_no, customer_name, total_price, payment_mode, pdf_url, pos_name, pos_id, created_by_type, admin_id, created_at;
    `;
    const values = [
      offerNo,
      customer_name || 'N/A',
      clean_total,
      payment_mode,
      down_payment,
      loan_amount,
      interest_rate,
      tenure,
      emi_amount,
      total_interest,
      total_emi_paid,
      pdfUrl,
      JSON.stringify(data),
      posName,
      posId,
      createdByType,
      pdfData,
      userId,
      partnerId,
      adminId
    ];

    const result = await pool.query(query, values);
    const createdQuotation = result.rows[0];

    // 4b. Automatically Create / Sync Linked Lead Record
    let leadRecord = null;
    try {
      const customerMobile = (data.contact_number || data.contactNumber || data.mobile || data.phone || '').toString().trim() || 'N/A';
      const customerEmail = data.email || null;
      const customerAddress = data.address || null;
      const custState = data.state || null;
      const custDistrict = data.district || null;
      const custPincode = data.pincode || null;
      const estimatedKw = parseFloat(data.system_capacity_kw || data.capacity || data.solar_capacity || data.kw || 0) || null;
      const validRoofTypes = ['flat', 'sloped', 'metal_sheet', 'rcc', 'other'];
      const roofType = (data.roof_type && validRoofTypes.includes(data.roof_type)) ? data.roof_type : 'other';
      const validPropTypes = ['residential', 'commercial', 'industrial', 'agricultural', 'institutional'];
      const propertyType = (data.property_type && validPropTypes.includes(data.property_type)) ? data.property_type : 'residential';
      const leadSource = (createdByType === 'pos' || partnerId) ? 'pos_partner' : 'website';

      const leadQuery = `
        INSERT INTO leads (
          partner_id, assigned_to, customer_name, mobile, email, address,
          state, district, pincode, estimated_kw, roof_type, property_type,
          source, stage, priority, quotation_id, quotation_no, quotation_amount,
          quotation_date, quotation_status, lead_status, pos_name, pos_id, user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
        ON CONFLICT (quotation_id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          mobile = EXCLUDED.mobile,
          email = COALESCE(EXCLUDED.email, leads.email),
          address = COALESCE(EXCLUDED.address, leads.address),
          state = COALESCE(EXCLUDED.state, leads.state),
          district = COALESCE(EXCLUDED.district, leads.district),
          pincode = COALESCE(EXCLUDED.pincode, leads.pincode),
          estimated_kw = COALESCE(EXCLUDED.estimated_kw, leads.estimated_kw),
          quotation_no = EXCLUDED.quotation_no,
          quotation_amount = EXCLUDED.quotation_amount,
          quotation_date = EXCLUDED.quotation_date,
          pos_name = EXCLUDED.pos_name,
          pos_id = EXCLUDED.pos_id,
          partner_id = COALESCE(EXCLUDED.partner_id, leads.partner_id),
          user_id = COALESCE(EXCLUDED.user_id, leads.user_id),
          updated_at = NOW()
        RETURNING *;
      `;
      const leadValues = [
        partnerId,
        userId,
        customer_name || 'N/A',
        customerMobile,
        customerEmail,
        customerAddress,
        custState,
        custDistrict,
        custPincode,
        estimatedKw,
        roofType,
        propertyType,
        leadSource,
        'quotation_sent',
        'medium',
        createdQuotation.id,
        createdQuotation.offer_no,
        clean_total,
        createdQuotation.created_at,
        'pending',
        'Pending',
        posName,
        posId,
        userId
      ];

      const leadRes = await pool.query(leadQuery, leadValues);
      leadRecord = leadRes.rows[0];

      if (leadRecord) {
        try {
          await pool.query(
            `INSERT INTO lead_status_history (lead_id, to_stage, changed_by, notes)
             VALUES ($1, 'quotation_sent', $2, $3)`,
            [leadRecord.id, userId || null, `Quotation generated: ${createdQuotation.offer_no}`]
          );
        } catch (_) {}
      }
    } catch (leadErr) {
      console.error('[Quotation] Failed to auto-create linked lead:', leadErr);
    }

    // 5. Respond
    res.status(201).json({
      success: true,
      quotation: createdQuotation,
      lead: leadRecord,
      pdfUrl,
    });

  } catch (error) {
    console.error('[PDF] Quotation Generation Failed:');
    console.error('  message :', error.message);
    if (error.stderr) console.error('  stderr  :', error.stderr);

    try {
      if (fs.existsSync(localPdfPath)) fs.unlinkSync(localPdfPath);
    } catch (_) {}

    if (error.code === '23505') {
      return res.status(400).json({
        error: 'This Quotation Sequence Number has already been used. Please specify a new 3-digit sequence number.'
      });
    }

    if (error.killed || error.code === 'ETIMEDOUT') {
      return res.status(500).json({ error: 'PDF generation timed out. Please try again.' });
    }

    const errorDetail = error.stderr ? error.stderr.trim() : error.message;
    res.status(500).json({
      error: errorDetail ? `Failed to process quotation request: ${errorDetail}` : 'Failed to process quotation request',
      details: errorDetail,
    });
  }
});

// ── GET /api/admin/quotations or /api/v2/quotations ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const isPosOnly = req.query.my === 'true';
    const statusFilter = req.query.status; // 'pending' | 'converted'
    let query = `
      SELECT id, offer_no, customer_name, total_price, payment_mode,
             down_payment, loan_amount, interest_rate, tenure, emi_amount,
             total_interest, total_emi_paid, pdf_url, raw_data,
             pos_name, pos_id, created_by_type, partner_id, user_id,
             status, invoice_id, invoice_no, converted_at,
             created_at, updated_at
      FROM quotations
      WHERE 1=1
    `;
    const values = [];

    // If POS user requests only their quotations
    if (isPosOnly && req.user?.id) {
      values.push(req.user.id);
      query += ` AND (user_id = $${values.length} OR partner_id = (SELECT id FROM pos_partners WHERE user_id = $${values.length}))`;
    }

    if (statusFilter) {
      values.push(statusFilter);
      query += ` AND status = $${values.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching quotations:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/quotations/:id ───────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM quotations WHERE id = $1', [id]);
    res.json({ success: true, message: 'Quotation deleted successfully.' });
  } catch (err) {
    console.error('Delete quotation error:', err);
    res.status(500).json({ error: 'Failed to delete quotation.' });
  }
});

export default router;
