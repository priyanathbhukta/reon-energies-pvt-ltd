import pool from './db.js';

async function fix() {
  try {
    const qRes = await pool.query(`UPDATE quotations SET pdf_url = '/pdfs/' || replace(offer_no, '/', '-') || '.pdf'`);
    console.log(`Updated ${qRes.rowCount} quotations`);
    
    const iRes = await pool.query(`UPDATE invoices SET pdf_url = '/pdfs/' || replace(invoice_no, '/', '-') || '.pdf'`);
    console.log(`Updated ${iRes.rowCount} invoices`);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
fix();
