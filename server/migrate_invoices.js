import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateInvoices() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running invoices migration...');

    // Create invoices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_no VARCHAR(100) UNIQUE NOT NULL,
        company_details JSONB NOT NULL,
        customer_details JSONB NOT NULL,
        invoice_details JSONB NOT NULL,
        items JSONB NOT NULL,
        subtotal NUMERIC(15, 2) DEFAULT 0,
        cgst_total NUMERIC(15, 2) DEFAULT 0,
        sgst_total NUMERIC(15, 2) DEFAULT 0,
        grand_total NUMERIC(15, 2) DEFAULT 0,
        pdf_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ invoices table ready');

    console.log('\n🎉 Invoices Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateInvoices();
