import pool from './db.js';

async function migrate() {
  console.log('🔄 Running Quotation POS Tracking DB migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure quotations table exists
    await client.query(`
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
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Add POS tracking and PDF data columns
    await client.query(`
      ALTER TABLE quotations
      ADD COLUMN IF NOT EXISTS pos_name VARCHAR(255) DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS pos_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS created_by_type VARCHAR(50) DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS pdf_data TEXT,
      ADD COLUMN IF NOT EXISTS user_id UUID,
      ADD COLUMN IF NOT EXISTS partner_id UUID;
    `);

    // 3. Set existing rows with NULL pos_name to 'admin'
    await client.query(`
      UPDATE quotations
      SET pos_name = 'admin', created_by_type = 'admin'
      WHERE pos_name IS NULL OR created_by_type IS NULL;
    `);

    // 4. Create indexes for quick lookup
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quotations_partner_id ON quotations(partner_id);
      CREATE INDEX IF NOT EXISTS idx_quotations_pos_id ON quotations(pos_id);
      CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by_type);
    `);

    await client.query('COMMIT');
    console.log('✅ Quotation POS Tracking migration successful!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
