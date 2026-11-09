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

const sendPdfResponse = (res, filePath, filename, req) => {
  const isInline = req.query.inline === 'true';
  const disposition = isInline ? 'inline' : 'attachment';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  return res.sendFile(filePath);
};

router.get('/:filename', async (req, res, next) => {
  const { filename } = req.params;
  const filePath = path.join(PDF_DIR, filename);
  const forceRegen = req.query.regen === 'true';

  // 1. If file exists on disk and no forceRegen, serve it immediately with download disposition
  if (fs.existsSync(filePath) && !forceRegen) {
    return sendPdfResponse(res, filePath, filename, req);
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
        isProforma: false,
        documentType: 'TAX INVOICE',
        companyDetails: typeof inv.company_details === 'string' ? JSON.parse(inv.company_details) : inv.company_details,
        customerDetails: typeof inv.customer_details === 'string' ? JSON.parse(inv.customer_details) : inv.customer_details,
        shipToDetails: typeof inv.ship_to_details === 'string' ? JSON.parse(inv.ship_to_details) : inv.ship_to_details,
        sameAsBillTo: inv.same_as_bill_to !== false,
        invoiceDetails: typeof inv.invoice_details === 'string' ? JSON.parse(inv.invoice_details) : inv.invoice_details,
        items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
        subtotal: inv.subtotal,
        cgstTotal: inv.cgst_total,
        sgstTotal: inv.sgst_total,
        grandTotal: inv.grand_total,
        proformaInvoiceNo: inv.proforma_invoice_no,
        quotationNo: inv.quotation_no,
        authorizedSignatureUrl: inv.authorized_signature_url,
      };

      console.log(`[PDF] Auto-regenerating missing Invoice: ${filename}`);
      await execFileAsync(runPythonCommand, [INVOICE_SCRIPT, '--output', filePath], {
        env: { ...process.env, REON_INVOICE_JSON: JSON.stringify(payload) },
        timeout: 60000,
      });

    } else if (filename.startsWith('PI-')) {
      const result = await pool.query('SELECT * FROM proforma_invoices WHERE pdf_url LIKE $1', [`%${filename}%`]);
      
      if (result.rows.length === 0) {
        return res.status(404).send('Proforma Invoice not found');
      }
      
      const pi = result.rows[0];
      const payload = {
        isProforma: true,
        documentType: 'PROFORMA INVOICE',
        companyDetails: typeof pi.company_details === 'string' ? JSON.parse(pi.company_details) : pi.company_details,
        customerDetails: typeof pi.customer_details === 'string' ? JSON.parse(pi.customer_details) : pi.customer_details,
        shipToDetails: typeof pi.ship_to_details === 'string' ? JSON.parse(pi.ship_to_details) : pi.ship_to_details,
        sameAsBillTo: pi.same_as_bill_to !== false,
        invoiceDetails: typeof pi.invoice_details === 'string' ? JSON.parse(pi.invoice_details) : pi.invoice_details,
        items: typeof pi.items === 'string' ? JSON.parse(pi.items) : pi.items,
        charges: typeof pi.charges === 'string' ? JSON.parse(pi.charges) : pi.charges,
        subtotal: pi.subtotal,
        cgstTotal: pi.cgst_total,
        sgstTotal: pi.sgst_total,
        grandTotal: pi.grand_total,
        quotationNo: pi.quotation_no,
        authorizedSignatureUrl: pi.authorized_signature_url,
      };

      console.log(`[PDF] Auto-regenerating missing Proforma Invoice: ${filename}`);
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

      // If binary PDF data is stored in the database, restore and serve it immediately!
      if (q.pdf_data) {
        console.log(`[PDF] Restoring Quotation directly from DB pdf_data: ${filename}`);
        fs.writeFileSync(filePath, Buffer.from(q.pdf_data, 'base64'));
        return sendPdfResponse(res, filePath, filename, req);
      }

      const payload = typeof q.raw_data === 'string' ? JSON.parse(q.raw_data) : q.raw_data;

      console.log(`[PDF] Auto-regenerating missing Quotation via Python: ${filename}`);
      await execFileAsync(runPythonCommand, [QUOTATION_SCRIPT, '--output', filePath], {
        env: { ...process.env, REON_QUOTE_JSON: JSON.stringify(payload) },
        timeout: 60000,
      });
    }

    // Serve the newly generated file
    if (fs.existsSync(filePath)) {
      return sendPdfResponse(res, filePath, filename, req);
    } else {
      return res.status(500).send('Failed to regenerate PDF');
    }

  } catch (err) {
    console.error(`[PDF] Auto-regeneration failed for ${filename}:`, err);
    res.status(500).send('Error generating PDF document');
  }
});

export default router;
