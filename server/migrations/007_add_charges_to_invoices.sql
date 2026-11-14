-- Add charges column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS charges JSONB DEFAULT '{}'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ship_to_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS same_as_bill_to BOOLEAN DEFAULT true;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_total NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS authorized_signature_url TEXT;
