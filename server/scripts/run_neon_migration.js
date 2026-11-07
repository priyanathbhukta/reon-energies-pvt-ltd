import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateNeon() {
  console.log('🔄 Checking & migrating Neon database schema...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check existing leads columns
    const leadColsRes = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'"
    );
    const existingLeadCols = leadColsRes.rows.map(r => r.column_name);
    console.log('Existing columns in leads:', existingLeadCols);

    // 2. Add columns to quotations table
    await client.query(`
      ALTER TABLE quotations
      ADD COLUMN IF NOT EXISTS pos_name VARCHAR(255) DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS pos_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS created_by_type VARCHAR(50) DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS pdf_data TEXT,
      ADD COLUMN IF NOT EXISTS user_id UUID,
      ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES pos_partners(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS admin_id INTEGER,
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100),
      ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
    `);

    // 3. Update leads table stage constraint
    await client.query(`
      ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_stage_check;
      ALTER TABLE leads ADD CONSTRAINT leads_stage_check 
        CHECK (stage IN ('new', 'contacted', 'site_visit_scheduled', 'quotation_sent', 'negotiation', 'converted', 'lost', 'pending', 'cancelled', 'expired'));
    `);

    // 4. Add linkage columns to leads table
    await client.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS quotation_no VARCHAR(255),
      ADD COLUMN IF NOT EXISTS quotation_amount NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS quotation_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS quotation_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS lead_status VARCHAR(50) DEFAULT 'Pending',
      ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100),
      ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS pos_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pos_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES pos_partners(id) ON DELETE SET NULL;
    `);

    // 5. Add unique constraint on quotation_id for ON CONFLICT DO UPDATE
    await client.query(`
      ALTER TABLE leads DROP CONSTRAINT IF EXISTS uq_leads_quotation_id;
      ALTER TABLE leads ADD CONSTRAINT uq_leads_quotation_id UNIQUE (quotation_id);
    `);

    // 6. Update invoices table
    await client.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS quotation_no VARCHAR(255),
      ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES pos_partners(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS pos_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pos_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    // 7. Performance indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_partner_id ON leads(partner_id);
      CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
      CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON leads(lead_status);
      CREATE INDEX IF NOT EXISTS idx_leads_invoice_id ON leads(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON invoices(quotation_id);
      CREATE INDEX IF NOT EXISTS idx_quotations_invoice_id ON quotations(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
    `);

    await client.query('COMMIT');
    console.log('✅ Neon database schema updated successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Neon schema migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }

  process.exit(0);
}

migrateNeon();
