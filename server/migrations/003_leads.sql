-- ============================================================
-- REON POS Portal — Migration 003: Leads
-- ============================================================

-- ─── Leads ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES pos_partners(id),
    assigned_to UUID REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    state VARCHAR(100),
    district VARCHAR(100),
    pincode VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    electricity_bill_amount DECIMAL(10, 2),
    roof_type VARCHAR(50) CHECK (roof_type IN ('flat', 'sloped', 'metal_sheet', 'rcc', 'other')),
    property_type VARCHAR(50) CHECK (property_type IN ('residential', 'commercial', 'industrial', 'agricultural', 'institutional')),
    estimated_kw DECIMAL(5, 2),
    source VARCHAR(50) DEFAULT 'pos_partner' CHECK (source IN ('pos_partner', 'referral', 'website', 'direct', 'whatsapp', 'other')),
    stage VARCHAR(30) DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'site_visit_scheduled', 'quotation_sent', 'negotiation', 'converted', 'lost')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    lost_reason TEXT,
    converted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_leads_partner ON leads(partner_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_mobile ON leads(mobile);
CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Lead Status History ────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    from_stage VARCHAR(30),
    to_stage VARCHAR(30) NOT NULL,
    changed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_lead ON lead_status_history(lead_id);

-- ─── Lead Notes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_lead ON lead_notes(lead_id);

-- ─── Lead Attachments ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_lead ON lead_attachments(lead_id);

-- ─── Site Visits ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    visited_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    notes TEXT,
    images JSONB DEFAULT '[]',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_lead ON site_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON site_visits(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_visits_status ON site_visits(status);
