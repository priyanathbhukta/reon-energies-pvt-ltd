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
  // Render / Nginx set x-forwarded-proto and x-forwarded-host
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  
  // If we are running locally, ignore PUBLIC_BASE_URL override so local testing works
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `${proto}://${host}`;
  }
  
  // Use the environment variable if explicitly set (most reliable in prod)
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

// ── POST /api/admin/quotations ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  const data = req.body;

  // Build quotation number: REPL/26-27/NNN
  const offerNo = data.offerNo || data.offer_no || `REPL/26-27/${Date.now()}`;

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
        timeout: 60000,          // 60-second limit
        maxBuffer: 5 * 1024 * 1024, // 5 MB stdout/stderr buffer
      }
    );

    if (stderr && stderr.trim()) {
      console.warn('[PDF] Python stderr:', stderr.trim());
    }
    console.log('[PDF] Python stdout:', stdout.trim());

    // 2. Build a URL to download the PDF from our static /pdfs route
    // Uses x-forwarded-proto/host so the URL is correct behind Nginx / Render
    const pdfUrl = `${getBaseUrl(req)}/pdfs/${pdfFileName}`;

    // 3. Save to Database
    const {
      customer_name,
      totalCost,
      financeParameters,
    } = data;

    const safeNum = val => parseFloat((val || '').toString().replace(/,/g, '')) || 0;

    const payment_mode  = financeParameters ? 'EMI / Loan' : 'Cash';
    const down_payment  = financeParameters?.downPayment  || 0;
    const loan_amount   = financeParameters?.loanAmount   || 0;
    const interest_rate = financeParameters?.interestRate || 0;
    const tenure        = financeParameters?.tenure       || 0;
    const emi_amount    = financeParameters?.emiAmount    || 0;
    const total_interest= financeParameters?.totalInterest|| 0;
    const total_emi_paid= financeParameters?.totalPayable || 0;
    const clean_total   = safeNum(totalCost);

    const query = `
      INSERT INTO quotations (
        offer_no, customer_name, total_price, payment_mode,
        down_payment, loan_amount, interest_rate, tenure,
        emi_amount, total_interest, total_emi_paid, pdf_url
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *;
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
    ];

    const result = await pool.query(query, values);

    // 4. Respond
    res.status(201).json({
      success: true,
      quotation: result.rows[0],
      pdfUrl,
    });

  } catch (error) {
    // Log full error details for debugging production issues
    console.error('[PDF] Quotation Generation Failed:');
    console.error('  message :', error.message);
    console.error('  code    :', error.code);
    if (error.stderr) console.error('  stderr  :', error.stderr);
    if (error.stdout) console.error('  stdout  :', error.stdout);
    console.error('  stack   :', error.stack);

    // Cleanup on failure
    try {
      if (fs.existsSync(localPdfPath)) fs.unlinkSync(localPdfPath);
    } catch (_) {}

    // PostgreSQL unique constraint violation (duplicate quotation number)
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'This Quotation Sequence Number has already been used. Please specify a new 3-digit sequence number.'
      });
    }

    // Python process timed out
    if (error.killed || error.code === 'ETIMEDOUT') {
      return res.status(500).json({ error: 'PDF generation timed out. Please try again.' });
    }

    // Python script exited with non-zero code — stderr has the real error
    const pyError = error.stderr ? error.stderr.trim() : error.message;
    res.status(500).json({
      error: 'Failed to process quotation request',
      details: pyError || error.message,
    });
  }
});

// ── GET /api/admin/quotations ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quotations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
