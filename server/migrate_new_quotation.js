import pool from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const SQL = `
CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    offer_no VARCHAR(255) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    down_payment NUMERIC(15,2),
    loan_amount NUMERIC(15,2),
    interest_rate NUMERIC(5,2),
    tenure INTEGER,
    emi_amount NUMERIC(15,2),
    total_interest NUMERIC(15,2),
    total_emi_paid NUMERIC(15,2),
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function migrate() {
  console.log('🔄  Running New Quotation DB migration...');
  try {
    await pool.query(SQL);
    console.log('✅  Table created: quotations');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
