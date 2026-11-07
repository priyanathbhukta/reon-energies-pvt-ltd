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

    const invoiceQuery = `
      INSERT INTO invoices (
        invoice_no, company_details, customer_details, invoice_details, items,
        subtotal, cgst_total, sgst_total, grand_total, pdf_url,
        quotation_id, quotation_no, lead_id, partner_id, pos_name, pos_id, user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (invoice_no) DO UPDATE SET
        company_details = EXCLUDED.company_details,
        customer_details = EXCLUDED.customer_details,
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
        user_id = COALESCE(EXCLUDED.user_id, invoices.user_id)
      RETURNING *;
    `;
    const invoiceValues = [
      invoiceNo,
      JSON.stringify(data.companyDetails || {}),
      JSON.stringify(data.customerDetails || {}),
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
    const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
