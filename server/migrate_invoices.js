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
        ship_to_details JSONB DEFAULT '{}'::jsonb,
        same_as_bill_to BOOLEAN DEFAULT true,
        invoice_details JSONB NOT NULL,
        items JSONB NOT NULL,
        charges JSONB DEFAULT '{}'::jsonb,
        subtotal NUMERIC(15, 2) DEFAULT 0,
        cgst_total NUMERIC(15, 2) DEFAULT 0,
        sgst_total NUMERIC(15, 2) DEFAULT 0,
        igst_total NUMERIC(15, 2) DEFAULT 0,
        grand_total NUMERIC(15, 2) DEFAULT 0,
        pdf_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS charges JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ship_to_details JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS same_as_bill_to BOOLEAN DEFAULT true;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_total NUMERIC(15, 2) DEFAULT 0;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS authorized_signature_url TEXT;
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
