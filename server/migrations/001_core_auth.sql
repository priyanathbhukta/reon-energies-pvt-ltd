-- ============================================================
-- REON POS Portal — Migration 001: Core Auth Tables
-- ============================================================
-- Safe to run on existing database — creates new tables only
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    is_mobile_verified BOOLEAN DEFAULT false,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE deleted_at IS NULL;

-- ─── Roles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Permissions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Role ↔ Permission (M2M) ───────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ─── User ↔ Role (M2M) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- ─── User Sessions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- ─── OTP Logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    mobile VARCHAR(15),
    email VARCHAR(255),
    otp_hash VARCHAR(255) NOT NULL,
    otp_type VARCHAR(20) NOT NULL CHECK (otp_type IN ('login', 'mfa', 'reset', 'verify_email', 'verify_mobile')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_logs(mobile, otp_type) WHERE verified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_logs(email, otp_type) WHERE verified_at IS NULL;

-- ─── Email Verifications ────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Audit Logs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ─── Seed Default Roles ─────────────────────────────────────
INSERT INTO roles (name, display_name, description) VALUES
    ('super_admin', 'Super Admin', 'Full system access'),
    ('sales_manager', 'Sales Manager', 'Manage sales team and leads'),
    ('finance_manager', 'Finance Manager', 'Manage commissions and payouts'),
    ('support_team', 'Support Team', 'Customer and partner support'),
    ('pos_partner', 'POS Partner', 'Point of Sale partner')
ON CONFLICT (name) DO NOTHING;

-- ─── Seed Default Permissions ───────────────────────────────
INSERT INTO permissions (name, resource, action, description) VALUES
    -- User management
    ('users.create', 'users', 'create', 'Create new users'),
    ('users.read', 'users', 'read', 'View user details'),
    ('users.update', 'users', 'update', 'Update user details'),
    ('users.delete', 'users', 'delete', 'Delete users'),
    -- Partner management
    ('partners.create', 'partners', 'create', 'Register new partners'),
    ('partners.read', 'partners', 'read', 'View partner details'),
    ('partners.update', 'partners', 'update', 'Update partner details'),
    ('partners.approve', 'partners', 'approve', 'Approve/reject partners'),
    -- Lead management
    ('leads.create', 'leads', 'create', 'Create new leads'),
    ('leads.read', 'leads', 'read', 'View lead details'),
    ('leads.read_all', 'leads', 'read_all', 'View all leads'),
    ('leads.update', 'leads', 'update', 'Update lead details'),
    ('leads.delete', 'leads', 'delete', 'Delete leads'),
    ('leads.assign', 'leads', 'assign', 'Assign leads to users'),
    -- Commission management
    ('commissions.read', 'commissions', 'read', 'View commissions'),
    ('commissions.manage', 'commissions', 'manage', 'Manage commission tiers'),
    ('payouts.read', 'payouts', 'read', 'View payouts'),
    ('payouts.process', 'payouts', 'process', 'Process payouts'),
    -- Marketing
    ('marketing.read', 'marketing', 'read', 'View marketing templates'),
    ('marketing.manage', 'marketing', 'manage', 'Manage marketing templates'),
    -- Analytics
    ('analytics.read', 'analytics', 'read', 'View own analytics'),
    ('analytics.read_all', 'analytics', 'read_all', 'View global analytics'),
    -- Admin
    ('admin.access', 'admin', 'access', 'Access admin panel'),
    ('audit.read', 'audit', 'read', 'View audit logs')
ON CONFLICT (name) DO NOTHING;

-- ─── Assign Permissions to Roles ────────────────────────────
-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- POS Partner permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'pos_partner' AND p.name IN (
    'leads.create', 'leads.read', 'leads.update',
    'commissions.read', 'payouts.read',
    'marketing.read', 'analytics.read'
)
ON CONFLICT DO NOTHING;

-- Sales Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'sales_manager' AND p.name IN (
    'leads.create', 'leads.read', 'leads.read_all', 'leads.update', 'leads.assign',
    'partners.read', 'partners.update',
    'analytics.read', 'analytics.read_all',
    'admin.access'
)
ON CONFLICT DO NOTHING;

-- Finance Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'finance_manager' AND p.name IN (
    'commissions.read', 'commissions.manage',
    'payouts.read', 'payouts.process',
    'analytics.read', 'analytics.read_all',
    'admin.access'
)
ON CONFLICT DO NOTHING;
