-- ============================================================
-- REON POS Portal — Migration 005: Marketing, Referrals & Notifications
-- ============================================================

-- ─── Marketing Templates ────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('rooftop', 'commercial', 'battery', 'festival', 'subsidy', 'general')),
    thumbnail_url TEXT,
    template_data JSONB NOT NULL DEFAULT '{}',
    dynamic_fields TEXT[] DEFAULT '{}',
    width INTEGER DEFAULT 1080,
    height INTEGER DEFAULT 1080,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON marketing_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON marketing_templates(is_active);

-- ─── Generated Assets ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS generated_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES pos_partners(id) ON DELETE CASCADE,
    template_id UUID REFERENCES marketing_templates(id),
    asset_url TEXT NOT NULL,
    format VARCHAR(10) DEFAULT 'png' CHECK (format IN ('png', 'jpg', 'pdf')),
    customization_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_partner ON generated_assets(partner_id);

-- ─── Referral Links ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES pos_partners(id) ON DELETE CASCADE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    qr_code_url TEXT,
    is_active BOOLEAN DEFAULT true,
    visit_count INTEGER DEFAULT 0,
    lead_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_partner ON referral_links(partner_id);
CREATE INDEX IF NOT EXISTS idx_referral_slug ON referral_links(slug);

-- ─── Referral Visits ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES referral_links(id) ON DELETE CASCADE,
    visitor_ip INET,
    user_agent TEXT,
    referrer TEXT,
    converted BOOLEAN DEFAULT false,
    lead_id UUID REFERENCES leads(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_referral ON referral_visits(referral_id);

-- ─── Notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('lead_update', 'commission', 'payout', 'system', 'kyc', 'announcement', 'reminder')),
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);
