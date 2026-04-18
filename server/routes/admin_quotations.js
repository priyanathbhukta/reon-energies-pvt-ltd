import express from 'express';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import util from 'util';
import pool from '../db.js';

const execFileAsync = util.promisify(execFile);
const router = express.Router();
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
    await execFileAsync(runPythonCommand, [SCRIPT_PATH, '--output', localPdfPath], {
      env: { ...process.env, REON_QUOTE_JSON: JSON.stringify(data) },
    });

    // 2. Build a URL to download the PDF from our static /pdfs route
    const protocol = req.protocol;
    const host = req.get('host');
    const pdfUrl = `${protocol}://${host}/pdfs/${pdfFileName}`;

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
    console.error('Quotation Generation Failed:', error);
    // Cleanup on failure
    if (fs.existsSync(localPdfPath)) fs.unlinkSync(localPdfPath);
    
    // Check if the error is a PostgreSQL unique constraint violation (duplicate quotation number)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This Quotation Sequence Number has already been used. Please specify a new 3-digit sequence number.' });
    }
    
    res.status(500).json({ error: 'Failed to process quotation request', details: error.message });
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
