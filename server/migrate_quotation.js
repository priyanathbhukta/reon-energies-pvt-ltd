/**
 * migrate_quotation.js
 * Run once: node migrate_quotation.js
 * Creates quotations and templates tables in PostgreSQL.
 */

import pool from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const SQL = `
-- ── Templates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(255)  NOT NULL,
  file_path            TEXT          NOT NULL,
  cloudinary_public_id TEXT,
  file_type            VARCHAR(10)   NOT NULL DEFAULT 'docx',   -- 'pdf' | 'docx'
  is_default           BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Quotations ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
  id                   SERIAL PRIMARY KEY,

  -- Customer info
  customer_name        VARCHAR(255)  NOT NULL,
  address              TEXT,
  electricity_provider VARCHAR(150),
  monthly_bill         NUMERIC(10,2),
  installation_type    VARCHAR(20)   DEFAULT 'domestic',   -- 'domestic' | 'commercial'

  -- Technical inputs
  load_kw              NUMERIC(8,2),
  power_factor         NUMERIC(4,2),
  installation_area    NUMERIC(10,2),
  panel_size           NUMERIC(6,2),
  panel_power          INTEGER,

  -- Payment
  payment_mode         VARCHAR(20)   DEFAULT 'Cash',       -- 'Cash' | 'EMI'
  cost_per_kw          NUMERIC(10,2),

  -- Calculated outputs
  system_size          NUMERIC(8,3),
  panels               INTEGER,
  area_required        NUMERIC(10,2),
  monthly_generation   NUMERIC(10,2),
  monthly_savings      NUMERIC(10,2),
  total_cost           NUMERIC(12,2),
  emi_details          JSONB,

  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_created_at    ON quotations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_name ON quotations (customer_name);
`;

async function migrate() {
  console.log('🔄  Running Quotation Generator migration...');
  try {
    await pool.query(SQL);
    console.log('✅  Tables created: templates, quotations');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
