-- ============================================================
-- REON POS Portal — Migration 002: POS Partners
-- ============================================================

-- ─── POS Partners ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL,
    gst_number VARCHAR(20),
    pan_number VARCHAR(15),
    aadhaar_number VARCHAR(15),
    address TEXT,
    state VARCHAR(100),
    district VARCHAR(100),
    pincode VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    referral_code VARCHAR(50) UNIQUE,
    referral_slug VARCHAR(100) UNIQUE,
    commission_tier VARCHAR(50) DEFAULT 'standard',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_partners_user ON pos_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON pos_partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_state ON pos_partners(state);
CREATE INDEX IF NOT EXISTS idx_partners_slug ON pos_partners(referral_slug);
CREATE INDEX IF NOT EXISTS idx_partners_code ON pos_partners(referral_code);

-- ─── Partner Documents ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES pos_partners(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('aadhaar', 'pan', 'gst', 'shop_photo', 'other')),
    document_url TEXT NOT NULL,
    document_name VARCHAR(255),
    file_size INTEGER,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_partner ON partner_documents(partner_id);

-- ─── Partner Bank Details ───────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES pos_partners(id) ON DELETE CASCADE,
    account_holder_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    ifsc_code VARCHAR(15) NOT NULL,
    bank_name VARCHAR(255),
    branch_name VARCHAR(255),
    is_primary BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_partner ON partner_bank_details(partner_id);

-- ─── Partner Regions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES pos_partners(id) ON DELETE CASCADE,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regions_partner ON partner_regions(partner_id);
CREATE INDEX IF NOT EXISTS idx_regions_state ON partner_regions(state, district);

-- ─── Updated_at trigger function ────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to pos_partners
DROP TRIGGER IF EXISTS update_pos_partners_updated_at ON pos_partners;
CREATE TRIGGER update_pos_partners_updated_at
    BEFORE UPDATE ON pos_partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to partner_bank_details
DROP TRIGGER IF EXISTS update_bank_details_updated_at ON partner_bank_details;
CREATE TRIGGER update_bank_details_updated_at
    BEFORE UPDATE ON partner_bank_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
