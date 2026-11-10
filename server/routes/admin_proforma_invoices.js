import express from 'express';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import util from 'util';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const execFileAsync = util.promisify(execFile);
const router = express.Router();

function requireAdminRole(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const role = decoded.role || (decoded.username ? 'admin' : null);
    if (role !== 'admin') {
      return res.status(403).json({
        error: "Access denied: Proforma invoice editing is strictly restricted to active profile 'admin'."
      });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

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
const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'run_invoice_pdf_gen.py');
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

// ── Helper: Get next Proforma Invoice Number dynamically from DB ───────────
export async function getNextProformaInvoiceNumber() {
  const fy = getCurrentFinancialYear();
  const query = `SELECT proforma_invoice_no FROM proforma_invoices WHERE proforma_invoice_no LIKE $1 OR proforma_invoice_no LIKE $2`;
  const values = [`%/${fy}/%`, `%-${fy}-%`];
  const { rows } = await pool.query(query, values);
  
  let maxSeq = 0;
  for (const row of rows) {
    if (!row.proforma_invoice_no) continue;
    const match = row.proforma_invoice_no.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const nextSeqNum = maxSeq + 1;
  const paddedSeq = String(nextSeqNum).padStart(3, '0');
  const nextProformaInvoiceNo = `PI/${fy}/${paddedSeq}`;
  return { fy, maxSeq, nextSeqNum, paddedSeq, nextProformaInvoiceNo };
}


// ── State-based GST Calculation Helper ────────────────────────────────────
export function isWestBengal(stateStr, gstin = '') {
  if (gstin && String(gstin).trim().startsWith('19')) return true;
  if (!stateStr) return true;
  const s = String(stateStr).toLowerCase().replace(/[^a-z0-9]/g, '');
  return s === 'westbengal' || s === 'wb' || s === 'paschimbanga' || s.startsWith('westbengal');
}

export function calculateTaxes(customerDetails, itemsRaw = [], charges = {}) {
  const intraState = isWestBengal(customerDetails?.state, customerDetails?.gstin);
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxRate = parseFloat(item.tax) || 0;
    const taxable = qty * rate;
    subtotal += taxable;

    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;

    if (intraState) {
      cgstRate = taxRate / 2;
      sgstRate = taxRate / 2;
      cgstAmt = taxable * (cgstRate / 100);
      sgstAmt = taxable * (sgstRate / 100);
      cgstTotal += cgstAmt;
      sgstTotal += sgstAmt;
    } else {
      igstRate = taxRate;
      igstAmt = taxable * (igstRate / 100);
      igstTotal += igstAmt;
    }

    return {
      ...item,
      quantity: qty,
      unit: (item.unit || item.per || 'PCS').toUpperCase(),
      rate,
      tax: taxRate,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmt,
      sgstAmt,
      igstAmt,
      invoiceValue: taxable,
    };
  });

  const loadingCharges = parseFloat(charges?.loadingCharges) || 0;
  const grandTotal = Math.round(subtotal + cgstTotal + sgstTotal + igstTotal + loadingCharges);

  return {
    intraState,
    items,
    subtotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    loadingCharges,
    grandTotal,
  };
}

// ── GET /api/admin/proforma-invoices/next-number ──────────────────────────
router.get('/next-number', async (req, res) => {
  try {
    const info = await getNextProformaInvoiceNumber();
    res.json({
      success: true,
      financialYear: info.fy,
      nextSeq: info.paddedSeq,
      nextProformaInvoiceNo: info.nextProformaInvoiceNo,
    });
  } catch (err) {
    console.error('Error fetching next proforma invoice number:', err);
    res.status(500).json({ error: 'Failed to fetch next proforma invoice number' });
  }
});

// ── GET /api/admin/proforma-invoices ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pi.*, 
             q.offer_no as linked_quotation_no,
             inv.invoice_no as converted_invoice_no
      FROM proforma_invoices pi
      LEFT JOIN quotations q ON pi.quotation_id = q.id
      LEFT JOIN invoices inv ON pi.generated_invoice_id = inv.id
      ORDER BY pi.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching proforma invoices:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/proforma-invoices/:id ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT pi.*,
             q.offer_no as linked_quotation_no,
             inv.invoice_no as converted_invoice_no,
             inv.created_at as invoice_created_at
      FROM proforma_invoices pi
      LEFT JOIN quotations q ON pi.quotation_id = q.id
      LEFT JOIN invoices inv ON pi.generated_invoice_id = inv.id
      WHERE pi.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching proforma invoice:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/proforma-invoices ─────────────────────────────────────
router.post('/', async (req, res) => {
  const data = req.body;
  
  // Resolve proforma invoice number dynamically if missing or placeholder
  let proformaInvoiceNo = data.invoiceDetails?.proformaInvoiceNo || data.invoiceDetails?.invoiceNo;
  if (!proformaInvoiceNo || proformaInvoiceNo.includes('000') || proformaInvoiceNo.includes('NNN')) {
    const info = await getNextProformaInvoiceNumber();
    proformaInvoiceNo = info.nextProformaInvoiceNo;
    if (data.invoiceDetails) {
      data.invoiceDetails.proformaInvoiceNo = proformaInvoiceNo;
      data.invoiceDetails.invoiceNo = proformaInvoiceNo;
    }
  }

  // Server-side State-based GST & Total Calculation
  const taxInfo = calculateTaxes(data.customerDetails, data.items, data.charges);
  data.items = taxInfo.items;
  data.subtotal = taxInfo.subtotal;
  data.cgstTotal = taxInfo.cgstTotal;
  data.sgstTotal = taxInfo.sgstTotal;
  data.igstTotal = taxInfo.igstTotal;
  data.grandTotal = taxInfo.grandTotal;

  // Ensure isProforma flag is set for Python PDF generator
  data.isProforma = true;
  data.documentType = 'PROFORMA INVOICE';

  const pdfFileName = `${proformaInvoiceNo.replace(/\//g, '-')}.pdf`;
  const localPdfPath = path.join(PDF_DIR, pdfFileName);

  const client = await pool.connect();
  try {
    const jsonPayload = JSON.stringify(data);
    console.log(`[PDF] Generating Proforma Invoice: ${pdfFileName}`);

    const { stdout, stderr } = await execFileAsync(
      runPythonCommand,
      [SCRIPT_PATH, '--output', localPdfPath],
      {
        env: { ...process.env, REON_INVOICE_JSON: jsonPayload },
        timeout: 60000,
        maxBuffer: 5 * 1024 * 1024,
      }
    );

    if (stderr && stderr.trim()) console.warn('[PDF] Python stderr:', stderr.trim());
    console.log('[PDF] Python stdout:', stdout.trim());

    const pdfUrl = `${getBaseUrl(req)}/pdfs/${pdfFileName}`;

    await client.query('BEGIN');

    // ── Check if a quotation was linked ────────────────────────
    let quotationId = data.quotation_id || data.quotationId || null;
    let quotationNo = data.quotation_no || data.quotationNo || null;
    let leadId = data.lead_id || data.leadId || null;
    let partnerId = data.partner_id || data.partnerId || null;
    let posName = data.pos_name || null;
    let posId = data.pos_id || null;
    let userId = data.user_id || data.userId || null;

    if (quotationId || quotationNo) {
      const qRes = await client.query(
        'SELECT * FROM quotations WHERE id = $1 OR offer_no = $2 LIMIT 1',
        [quotationId ? parseInt(quotationId, 10) : -1, quotationNo || '']
      );
      if (qRes.rows.length > 0) {
        const q = qRes.rows[0];
        quotationId = q.id;
        quotationNo = q.offer_no;
        partnerId = q.partner_id || partnerId;
        posName = q.pos_name || posName;
        posId = q.pos_id || posId;
        userId = q.user_id || userId;
      }
    }

    if (quotationId || leadId) {
      const lRes = await client.query(
        'SELECT * FROM leads WHERE quotation_id = $1 OR id = $2 LIMIT 1',
        [quotationId || -1, leadId || '00000000-0000-0000-0000-000000000000']
      );
      if (lRes.rows.length > 0) {
        const l = lRes.rows[0];
        leadId = l.id;
        partnerId = l.partner_id || partnerId;
        posName = l.pos_name || posName;
        posId = l.pos_id || posId;
        userId = l.user_id || userId;
      }
    }

    const subtotal = parseFloat(data.subtotal || 0);
    const cgstTotal = parseFloat(data.cgstTotal || 0);
    const sgstTotal = parseFloat(data.sgstTotal || 0);
    const grandTotal = parseFloat(data.grandTotal || 0);
    const validUntil = data.invoiceDetails?.validUntil || data.invoiceDetails?.dueDate || null;
    const sameAsBillTo = data.sameAsBillTo !== false;

    const query = `
      INSERT INTO proforma_invoices (
        proforma_invoice_no, quotation_id, quotation_no, lead_id, partner_id,
        pos_name, pos_id, user_id, company_details, customer_details,
        ship_to_details, same_as_bill_to, invoice_details, items, charges,
        subtotal, cgst_total, sgst_total, igst_total, grand_total, pdf_url,
        status, valid_until, authorized_signature_url, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,NOW())
      ON CONFLICT (proforma_invoice_no) DO UPDATE SET
        company_details = EXCLUDED.company_details,
        customer_details = EXCLUDED.customer_details,
        ship_to_details = EXCLUDED.ship_to_details,
        same_as_bill_to = EXCLUDED.same_as_bill_to,
        invoice_details = EXCLUDED.invoice_details,
        items = EXCLUDED.items,
        charges = EXCLUDED.charges,
        subtotal = EXCLUDED.subtotal,
        cgst_total = EXCLUDED.cgst_total,
        sgst_total = EXCLUDED.sgst_total,
        igst_total = EXCLUDED.igst_total,
        grand_total = EXCLUDED.grand_total,
        pdf_url = EXCLUDED.pdf_url,
        valid_until = EXCLUDED.valid_until,
        authorized_signature_url = EXCLUDED.authorized_signature_url,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      proformaInvoiceNo,
      quotationId,
      quotationNo,
      leadId,
      partnerId,
      posName,
      posId,
      userId,
      JSON.stringify(data.companyDetails || {}),
      JSON.stringify(data.customerDetails || {}),
      JSON.stringify(data.shipToDetails || {}),
      sameAsBillTo,
      JSON.stringify(data.invoiceDetails || {}),
      JSON.stringify(data.items || []),
      JSON.stringify(data.charges || {}),
      taxInfo.subtotal,
      taxInfo.cgstTotal,
      taxInfo.sgstTotal,
      taxInfo.igstTotal,
      taxInfo.grandTotal,
      pdfUrl,
      data.status || 'draft',
      validUntil,
      data.authorizedSignatureUrl || null,
    ];

    const result = await client.query(query, values);
    const createdProforma = result.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      proformaInvoice: createdProforma,
      pdfUrl,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[PDF] Proforma Invoice Generation Failed:', error);
    try {
      if (fs.existsSync(localPdfPath)) fs.unlinkSync(localPdfPath);
    } catch (_) {}

    res.status(500).json({
      error: 'Failed to process proforma invoice request',
      details: error.stderr ? error.stderr.trim() : error.message,
    });
  } finally {
    client.release();
  }
});

// ── POST /api/admin/proforma-invoices/:id/generate-invoice ─────────────────
// Converts an approved Proforma Invoice into an Original Tax Invoice.
// Enforces duplicate prevention: once generated, returns the existing invoice unless override requested.
router.post('/:id/generate-invoice', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const piRes = await client.query('SELECT * FROM proforma_invoices WHERE id = $1', [id]);
    if (piRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }

    const pi = piRes.rows[0];

    // Duplicate Invoice Prevention Check
    if (pi.generated_invoice_id && !req.body.force_recreate) {
      const existingInvRes = await client.query('SELECT * FROM invoices WHERE id = $1', [pi.generated_invoice_id]);
      if (existingInvRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `An original invoice (${existingInvRes.rows[0].invoice_no}) has already been generated from this proforma invoice.`,
          existingInvoice: existingInvRes.rows[0],
        });
      }
    }

    // Get Next Original Tax Invoice Number
    const { getNextInvoiceNumber } = await import('./admin_invoices.js');
    const invInfo = await getNextInvoiceNumber();
    const invoiceNo = invInfo.nextInvoiceNo;

    const companyDetails = typeof pi.company_details === 'string' ? JSON.parse(pi.company_details) : (pi.company_details || {});
    const customerDetails = typeof pi.customer_details === 'string' ? JSON.parse(pi.customer_details) : (pi.customer_details || {});
    const shipToDetails = typeof pi.ship_to_details === 'string' ? JSON.parse(pi.ship_to_details) : (pi.ship_to_details || {});
    const invoiceDetails = typeof pi.invoice_details === 'string' ? JSON.parse(pi.invoice_details) : (pi.invoice_details || {});
    const items = typeof pi.items === 'string' ? JSON.parse(pi.items) : (pi.items || []);
    const charges = typeof pi.charges === 'string' ? JSON.parse(pi.charges) : (pi.charges || {});

    // Prepare Original Invoice Details
    invoiceDetails.invoiceNo = invoiceNo;
    delete invoiceDetails.proformaInvoiceNo;
    invoiceDetails.invoiceDate = new Date().toISOString().split('T')[0];
    invoiceDetails.dueDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    const taxInfo = calculateTaxes(customerDetails, items, charges);
    const pdfData = {
      isProforma: false,
      is_proforma: false,
      documentType: 'TAX INVOICE',
      companyDetails,
      customerDetails,
      shipToDetails,
      sameAsBillTo: pi.same_as_bill_to !== false,
      invoiceDetails,
      items: taxInfo.items,
      charges,
      subtotal: taxInfo.subtotal,
      cgstTotal: taxInfo.cgstTotal,
      sgstTotal: taxInfo.sgstTotal,
      igstTotal: taxInfo.igstTotal,
      grandTotal: taxInfo.grandTotal,
      proformaInvoiceNo: pi.proforma_invoice_no,
      quotationNo: pi.quotation_no,
      authorizedSignatureUrl: pi.authorized_signature_url,
    };

    const pdfFileName = `${invoiceNo.replace(/\//g, '-')}.pdf`;
    const localPdfPath = path.join(PDF_DIR, pdfFileName);

    console.log(`[PDF] Generating Original Invoice from Proforma ${pi.proforma_invoice_no}: ${pdfFileName}`);
    const { stdout, stderr } = await execFileAsync(
      runPythonCommand,
      [SCRIPT_PATH, '--output', localPdfPath],
      {
        env: { ...process.env, REON_INVOICE_JSON: JSON.stringify(pdfData) },
        timeout: 60000,
        maxBuffer: 5 * 1024 * 1024,
      }
    );

    if (stderr && stderr.trim()) console.warn('[PDF] Python stderr:', stderr.trim());
    const pdfUrl = `${getBaseUrl(req)}/pdfs/${pdfFileName}`;

    const grandTotal = parseFloat(pi.grand_total || 0);

    // Insert into invoices
    const insertInvoiceQuery = `
      INSERT INTO invoices (
        invoice_no, company_details, customer_details, ship_to_details, same_as_bill_to,
        invoice_details, items, subtotal, cgst_total, sgst_total, igst_total, grand_total, pdf_url,
        source_proforma_invoice_id, proforma_invoice_no, quotation_id, quotation_no,
        lead_id, partner_id, pos_name, pos_id, user_id,
        payment_status, total_received, outstanding_amount, authorized_signature_url,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,NOW(),NOW())
      RETURNING *;
    `;

    const invValues = [
      invoiceNo,
      JSON.stringify(companyDetails),
      JSON.stringify(customerDetails),
      JSON.stringify(shipToDetails),
      pi.same_as_bill_to !== false,
      JSON.stringify(invoiceDetails),
      JSON.stringify(taxInfo.items),
      taxInfo.subtotal,
      taxInfo.cgstTotal,
      taxInfo.sgstTotal,
      taxInfo.igstTotal,
      taxInfo.grandTotal,
      pdfUrl,
      pi.id,
      pi.proforma_invoice_no,
      pi.quotation_id,
      pi.quotation_no,
      pi.lead_id,
      pi.partner_id,
      pi.pos_name,
      pi.pos_id,
      pi.user_id,
      'unpaid',
      0.00,
      grandTotal,
      pi.authorized_signature_url || null,
    ];

    const invResult = await client.query(insertInvoiceQuery, invValues);
    const createdInvoice = invResult.rows[0];

    // Link Proforma Invoice to generated invoice and update status
    await client.query(`
      UPDATE proforma_invoices
      SET status = 'converted',
          generated_invoice_id = $1,
          generated_invoice_no = $2,
          converted_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [createdInvoice.id, createdInvoice.invoice_no, pi.id]);

    // Convert Quotation & Lead if present
    if (pi.quotation_id) {
      await client.query(`
        UPDATE quotations
        SET status = 'converted',
            invoice_id = $1,
            invoice_no = $2,
            converted_at = NOW(),
            updated_at = NOW()
        WHERE id = $3
      `, [createdInvoice.id, createdInvoice.invoice_no, pi.quotation_id]);
    }

    if (pi.lead_id || pi.quotation_id) {
      await client.query(`
        UPDATE leads
        SET stage = 'converted',
            lead_status = 'Converted',
            invoice_id = $1,
            invoice_no = $2,
            invoice_amount = $3,
            converted_at = NOW(),
            updated_at = NOW()
        WHERE id = $4 OR quotation_id = $5
      `, [createdInvoice.id, createdInvoice.invoice_no, grandTotal, pi.lead_id || '00000000-0000-0000-0000-000000000000', pi.quotation_id || -1]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Original Tax Invoice ${createdInvoice.invoice_no} generated successfully from Proforma ${pi.proforma_invoice_no}`,
      invoice: createdInvoice,
      invoiceNo: createdInvoice.invoice_no,
      proformaInvoiceNo: pi.proforma_invoice_no,
      pdfUrl,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to generate original invoice from proforma:', err);
    res.status(500).json({ error: 'Failed to generate original invoice', details: err.message });
  } finally {
    client.release();
  }
});

// ── PUT /api/admin/proforma-invoices/:id (Role-Based Access Control: Admin only) ──
router.put('/:id', requireAdminRole, async (req, res) => {
  const { id } = req.params;
  const {
    companyDetails,
    customerDetails,
    shipToDetails,
    sameAsBillTo,
    invoiceDetails,
    items,
    charges,
    subtotal,
    cgstTotal,
    sgstTotal,
    grandTotal,
    validUntil,
    quotation_id,
    quotation_no,
    partner_id,
    pos_name,
    pos_id,
    authorizedSignatureUrl,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query('SELECT * FROM proforma_invoices WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Proforma invoice not found.' });
    }
    const pi = existingRes.rows[0];

    if (pi.status === 'converted' || pi.generated_invoice_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot modify a Proforma Invoice that has already been converted into an Original Tax Invoice.' });
    }

    const proformaInvoiceNo = invoiceDetails?.invoiceNo || pi.proforma_invoice_no;
    const invoiceDate = invoiceDetails?.invoiceDate || pi.created_at;

    const pdfFileName = `PI-${proformaInvoiceNo.replace(/\//g, '-')}.pdf`;
    const outputPath = path.join(PDF_DIR, pdfFileName);
    const pdfUrl = `/pdfs/${pdfFileName}`;

    const updateQuery = `
      UPDATE proforma_invoices
      SET company_details = $1,
          customer_details = $2,
          ship_to_details = $3,
          same_as_bill_to = $4,
          invoice_details = $5,
          items = $6,
          charges = $7,
          subtotal = $8,
          cgst_total = $9,
          sgst_total = $10,
          grand_total = $11,
          valid_until = $12,
          quotation_id = $13,
          quotation_no = $14,
          partner_id = $15,
          pos_name = $16,
          pos_id = $17,
          authorized_signature_url = $18,
          pdf_url = $19,
          updated_at = NOW()
      WHERE id = $20
      RETURNING *
    `;

    const updatedResult = await client.query(updateQuery, [
      JSON.stringify(companyDetails || {}),
      JSON.stringify(customerDetails || {}),
      JSON.stringify(shipToDetails || {}),
      sameAsBillTo !== false,
      JSON.stringify(invoiceDetails || {}),
      JSON.stringify(items || []),
      JSON.stringify(charges || {}),
      subtotal,
      cgstTotal,
      sgstTotal,
      grandTotal,
      validUntil || pi.valid_until,
      quotation_id || pi.quotation_id,
      quotation_no || pi.quotation_no,
      partner_id || pi.partner_id,
      pos_name || pi.pos_name,
      pos_id || pi.pos_id,
      authorizedSignatureUrl || pi.authorized_signature_url,
      pdfUrl,
      id
    ]);

    // Re-generate Proforma Invoice PDF with heading PROFORMA INVOICE
    const pyPayload = {
      isProforma: true,
      documentType: 'PROFORMA INVOICE',
      companyDetails,
      customerDetails,
      shipToDetails: sameAsBillTo !== false ? customerDetails : (shipToDetails || customerDetails),
      sameAsBillTo: sameAsBillTo !== false,
      invoiceDetails: {
        ...(invoiceDetails || {}),
        proformaInvoiceNo,
        invoiceDate,
        validUntil: validUntil || pi.valid_until
      },
      items,
      charges,
      subtotal,
      cgstTotal,
      sgstTotal,
      grandTotal,
      quotationNo: quotation_no || pi.quotation_no,
      authorizedSignatureUrl: authorizedSignatureUrl || pi.authorized_signature_url,
    };

    await execFileAsync(runPythonCommand, [SCRIPT_PATH, '--output', outputPath], {
      env: { ...process.env, REON_INVOICE_JSON: JSON.stringify(pyPayload) },
      timeout: 30000,
    });

    await client.query('COMMIT');

    const baseUrl = getBaseUrl(req);
    res.json({
      success: true,
      message: 'Proforma Invoice updated successfully by administrator.',
      proformaInvoice: updatedResult.rows[0],
      pdfUrl: `${baseUrl}${pdfUrl}`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update proforma error:', err);
    res.status(500).json({ error: err.message || 'Failed to update proforma invoice.' });
  } finally {
    client.release();
  }
});

// ── DELETE /api/admin/proforma-invoices/:id ───────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pi = await pool.query('SELECT * FROM proforma_invoices WHERE id = $1', [id]);
    if (pi.rows.length === 0) {
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }

    if (pi.rows[0].status === 'converted' || pi.rows[0].generated_invoice_id) {
      return res.status(400).json({ error: 'Cannot delete a proforma invoice that has already been converted into an original tax invoice.' });
    }

    await pool.query('DELETE FROM proforma_invoices WHERE id = $1', [id]);
    res.json({ success: true, message: 'Proforma invoice deleted successfully.' });
  } catch (err) {
    console.error('Error deleting proforma invoice:', err);
    res.status(500).json({ error: 'Failed to delete proforma invoice.' });
  }
});

export default router;
