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

/**
 * Role-Based Access Control Middleware
 * Invoices are editable ONLY by users with active profile 'admin'.
 */
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
        error: "Access denied: Invoice editing is strictly restricted to active profile 'admin'."
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
  
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
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

// ── Helper: Get next Invoice Number dynamically from DB ───────────────────
export async function getNextInvoiceNumber() {
  const fy = getCurrentFinancialYear();
  const query = `SELECT invoice_no FROM invoices WHERE invoice_no LIKE $1 OR invoice_no LIKE $2`;
  const values = [`%/${fy}/%`, `%-${fy}-%`];
  const { rows } = await pool.query(query, values);
  
  let maxSeq = 0;
  for (const row of rows) {
    if (!row.invoice_no) continue;
    const match = row.invoice_no.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const nextSeqNum = maxSeq + 1;
  const paddedSeq = String(nextSeqNum).padStart(3, '0');
  const nextInvoiceNo = `INV/${fy}/${paddedSeq}`;
  return { fy, maxSeq, nextSeqNum, paddedSeq, nextInvoiceNo };
}

// ── GET /api/admin/invoices/next-number ───────────────────────────────────
router.get('/next-number', async (req, res) => {
  try {
    const info = await getNextInvoiceNumber();
    res.json({
      success: true,
      financialYear: info.fy,
      nextSeq: info.paddedSeq,
      nextInvoiceNo: info.nextInvoiceNo,
    });
  } catch (err) {
    console.error('Error fetching next invoice number:', err);
    res.status(500).json({ error: 'Failed to fetch next invoice number' });
  }
});

// POST /api/admin/invoices
router.post('/', async (req, res) => {
  const data = req.body;
  
  // Dynamic runtime check: Resolve invoice number dynamically from DB if missing/placeholder
  let invoiceNo = data.invoiceDetails?.invoiceNo;
  if (!invoiceNo || invoiceNo.includes('000') || invoiceNo.includes('NNN')) {
    const info = await getNextInvoiceNumber();
    invoiceNo = info.nextInvoiceNo;
    if (data.invoiceDetails) {
      data.invoiceDetails.invoiceNo = invoiceNo;
    }
  }

  const pdfFileName = `${invoiceNo.replace(/\//g, '-')}.pdf`;
  const localPdfPath = path.join(PDF_DIR, pdfFileName);

  const client = await pool.connect();
  try {
    const jsonPayload = JSON.stringify(data);
    console.log(`[PDF] Generating Invoice: ${pdfFileName}`);

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
    let matchedQuotation = null;
    let matchedLead = null;

    if (quotationId || quotationNo) {
      const qRes = await client.query(
        'SELECT * FROM quotations WHERE id = $1 OR offer_no = $2 LIMIT 1',
        [quotationId ? parseInt(quotationId, 10) : -1, quotationNo || '']
      );
      if (qRes.rows.length > 0) {
        matchedQuotation = qRes.rows[0];
        quotationId = matchedQuotation.id;
        quotationNo = matchedQuotation.offer_no;
        partnerId = matchedQuotation.partner_id || partnerId;
        posName = matchedQuotation.pos_name || posName;
        posId = matchedQuotation.pos_id || posId;
        userId = matchedQuotation.user_id || userId;
      }
    }

    if (quotationId || leadId) {
      const lRes = await client.query(
        'SELECT * FROM leads WHERE quotation_id = $1 OR id = $2 LIMIT 1',
        [quotationId || -1, leadId || '00000000-0000-0000-0000-000000000000']
      );
      if (lRes.rows.length > 0) {
        matchedLead = lRes.rows[0];
        leadId = matchedLead.id;
        partnerId = matchedLead.partner_id || partnerId;
        posName = matchedLead.pos_name || posName;
        posId = matchedLead.pos_id || posId;
        userId = matchedLead.user_id || userId;
      }
    }

    const grandTotal = parseFloat(data.grandTotal || 0);
    const sourceProformaInvoiceId = data.source_proforma_invoice_id || data.sourceProformaInvoiceId || null;
    const proformaInvoiceNo = data.proforma_invoice_no || data.proformaInvoiceNo || null;
    const shipToDetails = data.shipToDetails || {};
    const sameAsBillTo = data.sameAsBillTo !== false;
    const signatureUrl = data.authorizedSignatureUrl || null;

    const invoiceQuery = `
      INSERT INTO invoices (
        invoice_no, company_details, customer_details, ship_to_details, same_as_bill_to,
        invoice_details, items, subtotal, cgst_total, sgst_total, grand_total, pdf_url,
        quotation_id, quotation_no, lead_id, partner_id, pos_name, pos_id, user_id,
        source_proforma_invoice_id, proforma_invoice_no, payment_status, total_received,
        outstanding_amount, authorized_signature_url, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'unpaid',0.00,$11,$22,NOW())
      ON CONFLICT (invoice_no) DO UPDATE SET
        company_details = EXCLUDED.company_details,
        customer_details = EXCLUDED.customer_details,
        ship_to_details = EXCLUDED.ship_to_details,
        same_as_bill_to = EXCLUDED.same_as_bill_to,
        invoice_details = EXCLUDED.invoice_details,
        items = EXCLUDED.items,
        subtotal = EXCLUDED.subtotal,
        cgst_total = EXCLUDED.cgst_total,
        sgst_total = EXCLUDED.sgst_total,
        grand_total = EXCLUDED.grand_total,
        pdf_url = EXCLUDED.pdf_url,
        quotation_id = COALESCE(EXCLUDED.quotation_id, invoices.quotation_id),
        quotation_no = COALESCE(EXCLUDED.quotation_no, invoices.quotation_no),
        lead_id = COALESCE(EXCLUDED.lead_id, invoices.lead_id),
        partner_id = COALESCE(EXCLUDED.partner_id, invoices.partner_id),
        pos_name = COALESCE(EXCLUDED.pos_name, invoices.pos_name),
        pos_id = COALESCE(EXCLUDED.pos_id, invoices.pos_id),
        user_id = COALESCE(EXCLUDED.user_id, invoices.user_id),
        source_proforma_invoice_id = COALESCE(EXCLUDED.source_proforma_invoice_id, invoices.source_proforma_invoice_id),
        proforma_invoice_no = COALESCE(EXCLUDED.proforma_invoice_no, invoices.proforma_invoice_no),
        authorized_signature_url = COALESCE(EXCLUDED.authorized_signature_url, invoices.authorized_signature_url),
        updated_at = NOW()
      RETURNING *;
    `;
    const invoiceValues = [
      invoiceNo,
      JSON.stringify(data.companyDetails || {}),
      JSON.stringify(data.customerDetails || {}),
      JSON.stringify(shipToDetails),
      sameAsBillTo,
      JSON.stringify(data.invoiceDetails || {}),
      JSON.stringify(data.items || []),
      data.subtotal || 0,
      data.cgstTotal || 0,
      data.sgstTotal || 0,
      grandTotal,
      pdfUrl,
      quotationId,
      quotationNo,
      leadId,
      partnerId,
      posName,
      posId,
      userId,
      sourceProformaInvoiceId,
      proformaInvoiceNo,
      signatureUrl,
    ];

    const result = await client.query(invoiceQuery, invoiceValues);
    const createdInvoice = result.rows[0];

    // ── Transactionally Convert Linked Quotation & Lead ────────
    if (matchedQuotation || quotationId) {
      await client.query(
        `UPDATE quotations 
         SET status = 'converted', invoice_id = $1, invoice_no = $2, converted_at = NOW(), updated_at = NOW() 
         WHERE id = $3`,
        [createdInvoice.id, createdInvoice.invoice_no, quotationId]
      );
    }

    if (matchedLead || leadId || quotationId) {
      await client.query(
        `UPDATE leads 
         SET stage = 'converted', lead_status = 'Converted', 
             invoice_id = $1, invoice_no = $2, invoice_amount = $3, 
             converted_at = NOW(), updated_at = NOW() 
         WHERE quotation_id = $4 OR id = $5`,
        [createdInvoice.id, createdInvoice.invoice_no, grandTotal, quotationId || -1, leadId || '00000000-0000-0000-0000-000000000000']
      );

      // Lead status history
      const targetLeadId = leadId || (matchedLead ? matchedLead.id : null);
      if (targetLeadId) {
        try {
          await client.query(
            `INSERT INTO lead_status_history (lead_id, from_stage, to_stage, changed_by, notes)
             VALUES ($1, 'quotation_sent', 'converted', $2, $3)`,
            [targetLeadId, userId || null, `Converted by invoice generation: ${createdInvoice.invoice_no}`]
          );
        } catch (_) {}
      }

      // Check partner commission
      if (partnerId) {
        try {
          const leadRow = matchedLead || (await client.query('SELECT estimated_kw FROM leads WHERE id = $1', [targetLeadId])).rows[0];
          const kw = parseFloat(leadRow?.estimated_kw) || 0;
          if (kw > 0) {
            const tier = await client.query(
              `SELECT * FROM commission_tiers
               WHERE is_active = true AND type = 'fixed_per_kw'
                 AND (min_kw IS NULL OR $1 >= min_kw)
                 AND (max_kw IS NULL OR $1 <= max_kw)
               ORDER BY rate DESC LIMIT 1`,
              [kw]
            );
            if (tier.rows.length > 0) {
              const commAmount = kw * parseFloat(tier.rows[0].rate);
              await client.query(
                `INSERT INTO commissions (partner_id, lead_id, tier_id, amount, kw_installed, status, calculation_details)
                 VALUES ($1, $2, $3, $4, $5, 'approved', $6)
                 ON CONFLICT DO NOTHING`,
                [partnerId, targetLeadId, tier.rows[0].id, commAmount, kw,
                 JSON.stringify({ kw, rate: tier.rows[0].rate, tierName: tier.rows[0].name, invoiceNo })]
              );
              // Credit partner wallet
              const wallet = await client.query('SELECT id, balance FROM wallets WHERE partner_id = $1', [partnerId]);
              if (wallet.rows.length > 0) {
                const newBalance = parseFloat(wallet.rows[0].balance) + commAmount;
                await client.query('UPDATE wallets SET balance = $1, total_earned = total_earned + $2 WHERE id = $3', [newBalance, commAmount, wallet.rows[0].id]);
                await client.query(
                  `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_type, reference_id, description)
                   VALUES ($1, 'credit', $2, $3, 'commission', $4, $5)`,
                  [wallet.rows[0].id, commAmount, newBalance, targetLeadId, `Commission for ${kw} kW installation (Inv ${invoiceNo})`]
                );
              }
            }
          }
        } catch (commErr) {
          console.warn('[Invoice] Commission calculation notice:', commErr.message);
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      invoice: createdInvoice,
      pdfUrl,
      linkedQuotation: matchedQuotation ? { id: matchedQuotation.id, offer_no: matchedQuotation.offer_no } : null,
      convertedLead: matchedLead ? { id: matchedLead.id, stage: 'converted', lead_status: 'Converted' } : null,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[PDF] Invoice Generation Failed:', error);
    try {
      if (fs.existsSync(localPdfPath)) fs.unlinkSync(localPdfPath);
    } catch (_) {}

    res.status(500).json({
      error: 'Failed to process invoice request',
      details: error.stderr ? error.stderr.trim() : error.message,
    });
  } finally {
    client.release();
  }
});

// POST /api/admin/invoices/link-quotation (Manual conversion/linking)
router.post('/link-quotation', async (req, res) => {
  const { invoice_id, quotation_id } = req.body;
  if (!invoice_id || !quotation_id) {
    return res.status(400).json({ error: 'Both invoice_id and quotation_id are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invRes = await client.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);
    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const invoice = invRes.rows[0];

    const quotRes = await client.query('SELECT * FROM quotations WHERE id = $1', [quotation_id]);
    if (quotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quotation not found' });
    }
    const quotation = quotRes.rows[0];

    // Find lead
    const leadRes = await client.query('SELECT * FROM leads WHERE quotation_id = $1', [quotation.id]);
    const lead = leadRes.rows[0] || null;

    // Link invoice
    await client.query(
      `UPDATE invoices 
       SET quotation_id = $1, quotation_no = $2, lead_id = $3, partner_id = $4, pos_name = $5, pos_id = $6, user_id = $7 
       WHERE id = $8`,
      [quotation.id, quotation.offer_no, lead?.id || null, quotation.partner_id, quotation.pos_name, quotation.pos_id, quotation.user_id, invoice.id]
    );

    // Convert quotation
    await client.query(
      `UPDATE quotations 
       SET status = 'converted', invoice_id = $1, invoice_no = $2, converted_at = NOW(), updated_at = NOW() 
       WHERE id = $3`,
      [invoice.id, invoice.invoice_no, quotation.id]
    );

    // Convert lead
    if (lead) {
      await client.query(
        `UPDATE leads 
         SET stage = 'converted', lead_status = 'Converted', invoice_id = $1, invoice_no = $2, invoice_amount = $3, converted_at = NOW(), updated_at = NOW() 
         WHERE id = $4`,
        [invoice.id, invoice.invoice_no, invoice.grand_total, lead.id]
      );
      try {
        await client.query(
          `INSERT INTO lead_status_history (lead_id, from_stage, to_stage, notes)
           VALUES ($1, 'quotation_sent', 'converted', $2)`,
          [lead.id, `Manually linked to invoice: ${invoice.invoice_no}`]
        );
      } catch (_) {}
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Quotation and lead successfully linked to invoice.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Link quotation error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/admin/invoices
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT inv.*,
             pi.proforma_invoice_no,
             q.offer_no as linked_quotation_no,
             COALESCE(p_agg.total_received, inv.total_received, 0) as total_received,
             GREATEST(0, inv.grand_total - COALESCE(p_agg.total_received, inv.total_received, 0)) as outstanding_amount,
             CASE
               WHEN COALESCE(p_agg.total_received, inv.total_received, 0) <= 0 THEN 'unpaid'
               WHEN COALESCE(p_agg.total_received, inv.total_received, 0) >= inv.grand_total THEN 'paid'
               ELSE 'partially_paid'
             END as payment_status,
             COALESCE(p_agg.confirmed_count, 0) as payment_count
      FROM invoices inv
      LEFT JOIN proforma_invoices pi ON inv.source_proforma_invoice_id = pi.id
      LEFT JOIN quotations q ON inv.quotation_id = q.id
      LEFT JOIN (
        SELECT invoice_id,
               SUM(amount_received) as total_received,
               COUNT(*) as confirmed_count
        FROM invoice_payments
        WHERE status = 'confirmed'
        GROUP BY invoice_id
      ) p_agg ON inv.id = p_agg.invoice_id
      ORDER BY inv.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch invoices error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/invoices/search
router.get('/search', async (req, res) => {
  try {
    const { quotationNumber, customerName, invoiceNumber } = req.query;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (quotationNumber) {
      conditions.push(`(inv.quotation_no ILIKE $${idx} OR q.offer_no ILIKE $${idx})`);
      params.push(`%${quotationNumber.trim()}%`);
      idx++;
    }

    if (invoiceNumber) {
      conditions.push(`inv.invoice_no ILIKE $${idx}`);
      params.push(`%${invoiceNumber.trim()}%`);
      idx++;
    }

    if (customerName) {
      conditions.push(`(inv.customer_details->>'name' ILIKE $${idx} OR inv.pos_name ILIKE $${idx})`);
      params.push(`%${customerName.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT inv.*,
             pi.proforma_invoice_no,
             q.offer_no as linked_quotation_no,
             COALESCE(p_agg.total_received, inv.total_received, 0) as total_received,
             GREATEST(0, inv.grand_total - COALESCE(p_agg.total_received, inv.total_received, 0)) as outstanding_amount,
             CASE
               WHEN COALESCE(p_agg.total_received, inv.total_received, 0) <= 0 THEN 'unpaid'
               WHEN COALESCE(p_agg.total_received, inv.total_received, 0) >= inv.grand_total THEN 'paid'
               ELSE 'partially_paid'
             END as payment_status
      FROM invoices inv
      LEFT JOIN proforma_invoices pi ON inv.source_proforma_invoice_id = pi.id
      LEFT JOIN quotations q ON inv.quotation_id = q.id
      LEFT JOIN (
        SELECT invoice_id,
               SUM(amount_received) as total_received
        FROM invoice_payments
        WHERE status = 'confirmed'
        GROUP BY invoice_id
      ) p_agg ON inv.id = p_agg.invoice_id
      ${whereClause}
      ORDER BY inv.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Search invoices error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invRes = await pool.query(`
      SELECT inv.*,
             pi.proforma_invoice_no,
             q.offer_no as linked_quotation_no
      FROM invoices inv
      LEFT JOIN proforma_invoices pi ON inv.source_proforma_invoice_id = pi.id
      LEFT JOIN quotations q ON inv.quotation_id = q.id
      WHERE inv.id = $1
    `, [id]);

    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invRes.rows[0];

    // Fetch payments
    const paymentsRes = await pool.query(
      'SELECT * FROM invoice_payments WHERE invoice_id = $1 ORDER BY payment_date DESC, created_at DESC',
      [id]
    );

    const payments = paymentsRes.rows;
    const confirmedTotal = payments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + parseFloat(p.amount_received || 0), 0);
    const grandTotal = parseFloat(invoice.grand_total || 0);
    const outstanding = Math.max(0, parseFloat((grandTotal - confirmedTotal).toFixed(2)));

    let paymentStatus = 'unpaid';
    if (confirmedTotal > 0) {
      if (Math.abs(confirmedTotal - grandTotal) < 0.01) {
        paymentStatus = 'paid';
      } else if (confirmedTotal < grandTotal) {
        paymentStatus = 'partially_paid';
      } else {
        paymentStatus = 'overpaid';
      }
    }

    invoice.payments = payments;
    invoice.total_received = confirmedTotal;
    invoice.outstanding_amount = outstanding;
    invoice.payment_status = paymentStatus;

    res.json(invoice);
  } catch (err) {
    console.error('Get invoice details error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/invoices/:id (Role-Based Access Control: Admin only)
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
    quotation_id,
    quotation_no,
    authorizedSignatureUrl
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    const inv = existingRes.rows[0];

    const invoiceNo = invoiceDetails?.invoiceNo || inv.invoice_no;
    const invoiceDate = invoiceDetails?.invoiceDate || inv.created_at;

    const pdfFileName = `INV-${invoiceNo.replace(/\//g, '-')}.pdf`;
    const outputPath = path.join(PDF_DIR, pdfFileName);
    const pdfUrl = `/pdfs/${pdfFileName}`;

    const updateQuery = `
      UPDATE invoices
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
          quotation_id = $12,
          quotation_no = $13,
          authorized_signature_url = $14,
          pdf_url = $15,
          updated_at = NOW()
      WHERE id = $16
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
      quotation_id || inv.quotation_id,
      quotation_no || inv.quotation_no,
      authorizedSignatureUrl || inv.authorized_signature_url,
      pdfUrl,
      id
    ]);

    // Re-generate Tax Invoice PDF with updated details
    const pyPayload = {
      isProforma: false,
      documentType: 'TAX INVOICE',
      companyDetails,
      customerDetails,
      shipToDetails: sameAsBillTo !== false ? customerDetails : (shipToDetails || customerDetails),
      sameAsBillTo: sameAsBillTo !== false,
      invoiceDetails: { ...(invoiceDetails || {}), invoiceNo, invoiceDate },
      items,
      charges,
      subtotal,
      cgstTotal,
      sgstTotal,
      grandTotal,
      quotationNo: quotation_no || inv.quotation_no,
      proformaInvoiceNo: inv.proforma_invoice_no,
      authorizedSignatureUrl: authorizedSignatureUrl || inv.authorized_signature_url,
    };

    await execFileAsync(runPythonCommand, [SCRIPT_PATH, '--output', outputPath], {
      env: { ...process.env, REON_INVOICE_JSON: JSON.stringify(pyPayload) },
      timeout: 30000,
    });

    await client.query('COMMIT');

    const baseUrl = getBaseUrl(req);
    res.json({
      success: true,
      message: 'Invoice updated successfully by administrator.',
      invoice: updatedResult.rows[0],
      pdfUrl: `${baseUrl}${pdfUrl}`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update invoice error:', err);
    res.status(500).json({ error: err.message || 'Failed to update invoice.' });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM invoices WHERE id = $1', [id]);
    res.json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (err) {
    console.error('Delete invoice error:', err);
    res.status(500).json({ error: 'Failed to delete invoice.' });
  }
});

export default router;
