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

// POST /api/admin/invoices
router.post('/', async (req, res) => {
  const data = req.body;
  const invoiceNo = data.invoiceDetails?.invoiceNo || `INV/${Date.now()}`;
  const pdfFileName = `${invoiceNo.replace(/\//g, '-')}.pdf`;
  const localPdfPath = path.join(PDF_DIR, pdfFileName);

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

    const query = `
      INSERT INTO invoices (
        invoice_no, company_details, customer_details, invoice_details, items,
        subtotal, cgst_total, sgst_total, grand_total, pdf_url
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (invoice_no) DO UPDATE SET
        company_details = EXCLUDED.company_details,
        customer_details = EXCLUDED.customer_details,
        invoice_details = EXCLUDED.invoice_details,
        items = EXCLUDED.items,
        subtotal = EXCLUDED.subtotal,
        cgst_total = EXCLUDED.cgst_total,
        sgst_total = EXCLUDED.sgst_total,
        grand_total = EXCLUDED.grand_total,
        pdf_url = EXCLUDED.pdf_url
      RETURNING *;
    `;
    const values = [
      invoiceNo,
      JSON.stringify(data.companyDetails || {}),
      JSON.stringify(data.customerDetails || {}),
      JSON.stringify(data.invoiceDetails || {}),
      JSON.stringify(data.items || []),
      data.subtotal || 0,
      data.cgstTotal || 0,
      data.sgstTotal || 0,
      data.grandTotal || 0,
      pdfUrl,
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      invoice: result.rows[0],
      pdfUrl,
    });
  } catch (error) {
    console.error('[PDF] Invoice Generation Failed:', error);
    try {
      if (fs.existsSync(localPdfPath)) fs.unlinkSync(localPdfPath);
    } catch (_) {}

    res.status(500).json({
      error: 'Failed to process invoice request',
      details: error.stderr ? error.stderr.trim() : error.message,
    });
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
