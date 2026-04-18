-- ============================================================
-- REON ENERGIES — Quotation Module Database Schema
-- Run once on your PostgreSQL instance:
--   psql -U postgres -d reonenergy -f schema.sql
-- ============================================================

-- Auto-increment counter per fiscal year prefix
CREATE TABLE IF NOT EXISTS quotation_counter (
  prefix      VARCHAR(20) PRIMARY KEY,   -- e.g. "REPV/26-27"
  last_seq    INTEGER NOT NULL DEFAULT 100,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id                  SERIAL PRIMARY KEY,
  offer_no            VARCHAR(30)  NOT NULL UNIQUE,  -- e.g. REPV/26-27/101
  status              VARCHAR(20)  NOT NULL DEFAULT 'draft',
                      -- draft | sent | accepted | rejected | expired

  -- Issue / expiry
  issue_date          DATE         NOT NULL DEFAULT CURRENT_DATE,
  valid_till          DATE         GENERATED ALWAYS AS (issue_date + INTERVAL '30 days') STORED,

  -- Customer
  customer_name       VARCHAR(200) NOT NULL,
  address             TEXT,
  contact_number      VARCHAR(20),
  email               VARCHAR(100),
  state               VARCHAR(100) DEFAULT 'West Bengal',

  -- Project
  project_category    VARCHAR(50)  DEFAULT 'Residential',  -- Residential|Commercial|Industrial
  roof_type           VARCHAR(100),
  project_location    TEXT,
  electricity_provider VARCHAR(100),
  monthly_bill        VARCHAR(30),
  power_factor        VARCHAR(10),

  -- PV System
  capacity            VARCHAR(30),   -- e.g. "3.5 KWp"
  module_technology   VARCHAR(200),
  inverter_type       VARCHAR(100),
  brands              VARCHAR(300),
  power_evacuation    VARCHAR(50),
  project_type        VARCHAR(100)   DEFAULT 'Turnkey EPC Project',

  -- Pricing (stored as text to preserve formatting like "1,60,000")
  base_price          VARCHAR(30),
  gst_amount          VARCHAR(30),
  total_price         VARCHAR(30),

  -- PDF storage
  pdf_path            TEXT,          -- absolute server path to generated PDF
  pdf_generated_at    TIMESTAMPTZ,

  -- Metadata
  created_by          INTEGER,       -- FK to users table if you have one
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_quotations_offer_no ON quotations(offer_no);
CREATE INDEX IF NOT EXISTS idx_quotations_customer  ON quotations(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotations_status    ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created   ON quotations(created_at DESC);

-- Function: auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quotations_updated_at ON quotations;
CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

-- Seed initial counter row (2026-27 fiscal year)
INSERT INTO quotation_counter (prefix, last_seq)
VALUES ('REPV/26-27', 100)
ON CONFLICT (prefix) DO NOTHING;
