-- ============================================================
-- REON POS Portal — Migration 004: Commission & Wallet
-- ============================================================

-- ─── Commission Tiers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed_per_kw', 'product_based')),
    rate DECIMAL(10, 2) NOT NULL,
    min_kw DECIMAL(5, 2),
    max_kw DECIMAL(5, 2),
    product_category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Commissions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES pos_partners(id),
    lead_id UUID REFERENCES leads(id),
    tier_id UUID REFERENCES commission_tiers(id),
    amount DECIMAL(12, 2) NOT NULL,
    kw_installed DECIMAL(5, 2),
    calculation_details JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_partner ON commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_commissions_lead ON commissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);

-- ─── Wallets ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID UNIQUE NOT NULL REFERENCES pos_partners(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) DEFAULT 0 CHECK (balance >= 0),
    total_earned DECIMAL(12, 2) DEFAULT 0,
    total_withdrawn DECIMAL(12, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_partner ON wallets(partner_id);

-- ─── Wallet Transactions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    balance_after DECIMAL(12, 2) NOT NULL,
    reference_type VARCHAR(50) CHECK (reference_type IN ('commission', 'payout', 'bonus', 'adjustment', 'refund')),
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_txn_created ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_txn_type ON wallet_transactions(type);

-- ─── Payouts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES pos_partners(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    bank_detail_id UUID REFERENCES partner_bank_details(id),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'completed', 'failed', 'cancelled')),
    transaction_reference VARCHAR(255),
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_partner ON payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- ─── Seed Default Commission Tiers ──────────────────────────
INSERT INTO commission_tiers (name, type, rate, min_kw, max_kw) VALUES
    ('Standard - Small', 'fixed_per_kw', 2500.00, 1, 3),
    ('Standard - Medium', 'fixed_per_kw', 2000.00, 3, 10),
    ('Standard - Large', 'fixed_per_kw', 1500.00, 10, 100),
    ('Premium - Percentage', 'percentage', 3.00, NULL, NULL)
ON CONFLICT DO NOTHING;
