import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';
import { execFile } from 'child_process';
import pool from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_DIR = path.join(__dirname, '..', 'pdfs');
const QUOTATION_SCRIPT = path.join(__dirname, '..', 'scripts', 'run_pdf_gen.py');
const INVOICE_SCRIPT = path.join(__dirname, '..', 'scripts', 'run_invoice_pdf_gen.py');

const execFileAsync = util.promisify(execFile);
const runPythonCommand = process.platform === 'win32' ? 'python' : 'python3';

const router = express.Router();

router.get('/:filename', async (req, res, next) => {
  const { filename } = req.params;
  const filePath = path.join(PDF_DIR, filename);

  // 1. If file exists on disk, serve it immediately
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // 2. File doesn't exist (likely Render disk wiped). Re-generate it!
  try {
    if (!fs.existsSync(PDF_DIR)) {
      fs.mkdirSync(PDF_DIR, { recursive: true });
    }

    if (filename.startsWith('INV-')) {
      const result = await pool.query('SELECT * FROM invoices WHERE pdf_url LIKE $1', [`%${filename}%`]);
      
      if (result.rows.length === 0) {
        return res.status(404).send('Invoice not found');
      }
      
      const inv = result.rows[0];
      const payload = {
        companyDetails: typeof inv.company_details === 'string' ? JSON.parse(inv.company_details) : inv.company_details,
        customerDetails: typeof inv.customer_details === 'string' ? JSON.parse(inv.customer_details) : inv.customer_details,
        invoiceDetails: typeof inv.invoice_details === 'string' ? JSON.parse(inv.invoice_details) : inv.invoice_details,
        items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
        subtotal: inv.subtotal,
        cgstTotal: inv.cgst_total,
        sgstTotal: inv.sgst_total,
        grandTotal: inv.grand_total,
      };

      console.log(`[PDF] Auto-regenerating missing Invoice: ${filename}`);
      await execFileAsync(runPythonCommand, [INVOICE_SCRIPT, '--output', filePath], {
        env: { ...process.env, REON_INVOICE_JSON: JSON.stringify(payload) },
        timeout: 60000,
      });

    } else {
      const result = await pool.query('SELECT * FROM quotations WHERE pdf_url LIKE $1', [`%${filename}%`]);
      
      if (result.rows.length === 0) {
        return res.status(404).send('Quotation not found');
      }
      
      const q = result.rows[0];
      const payload = typeof q.raw_data === 'string' ? JSON.parse(q.raw_data) : q.raw_data;

      console.log(`[PDF] Auto-regenerating missing Quotation: ${filename}`);
      await execFileAsync(runPythonCommand, [QUOTATION_SCRIPT, '--output', filePath], {
        env: { ...process.env, REON_QUOTE_JSON: JSON.stringify(payload) },
        timeout: 60000,
      });
    }

    // Serve the newly generated file
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    } else {
      return res.status(500).send('Failed to regenerate PDF');
    }

  } catch (err) {
    console.error(`[PDF] Auto-regeneration failed for ${filename}:`, err);
    res.status(500).send('Error generating PDF document');
  }
});

export default router;
