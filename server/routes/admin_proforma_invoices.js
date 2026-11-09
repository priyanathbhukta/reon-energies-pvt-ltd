import express from 'express';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import util from 'util';
import pool from '../db.js';

const execFileAsync = util.promisify(execFile);
const router = express.Router();

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
        subtotal, cgst_total, sgst_total, grand_total, pdf_url,
        status, valid_until, authorized_signature_url, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW())
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
      subtotal,
      cgstTotal,
      sgstTotal,
      grandTotal,
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
    invoiceDetails.invoiceDate = new Date().toISOString().split('T')[0];
    invoiceDetails.dueDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    const pdfData = {
      isProforma: false,
      documentType: 'TAX INVOICE',
      companyDetails,
      customerDetails,
      shipToDetails,
      sameAsBillTo: pi.same_as_bill_to !== false,
      invoiceDetails,
      items,
      charges,
      subtotal: parseFloat(pi.subtotal || 0),
      cgstTotal: parseFloat(pi.cgst_total || 0),
      sgstTotal: parseFloat(pi.sgst_total || 0),
      grandTotal: parseFloat(pi.grand_total || 0),
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
        invoice_details, items, subtotal, cgst_total, sgst_total, grand_total, pdf_url,
        source_proforma_invoice_id, proforma_invoice_no, quotation_id, quotation_no,
        lead_id, partner_id, pos_name, pos_id, user_id,
        payment_status, total_received, outstanding_amount, authorized_signature_url,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW(),NOW())
      RETURNING *;
    `;

    const invValues = [
      invoiceNo,
      JSON.stringify(companyDetails),
      JSON.stringify(customerDetails),
      JSON.stringify(shipToDetails),
      pi.same_as_bill_to !== false,
      JSON.stringify(invoiceDetails),
      JSON.stringify(items),
      pi.subtotal,
      pi.cgst_total,
      pi.sgst_total,
      grandTotal,
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
