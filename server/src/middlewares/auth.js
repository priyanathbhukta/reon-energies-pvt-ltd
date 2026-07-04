import jwt from 'jsonwebtoken';
import config from '../config/app.js';
import pool from '../config/database.js';

/**
 * Authenticate user via JWT access token.
 * Supports both:
 *   - Legacy admin tokens: { id, username } (from /api/auth/login with admins table)
 *   - POS tokens: { userId } (from /api/auth/pos-login with users table)
 * Sets req.user with { id, roles, permissions }.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Support both legacy (id) and new (userId) token formats
    const userId = decoded.userId || decoded.id;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = typeof userId === 'string' && uuidRegex.test(userId);

    let userResult = { rows: [] };

    if (isValidUuid) {
      // First try: look up in users table (POS users + linked admin users)
      userResult = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.mobile, u.avatar_url, u.is_active,
                array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles,
                array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         LEFT JOIN permissions p ON rp.permission_id = p.id
         WHERE u.id = $1 AND u.deleted_at IS NULL
         GROUP BY u.id`,
        [userId]
      );
    }

    // If not found and this is a legacy admin token (has username), verify against admins table
    if (userResult.rows.length === 0 && decoded.username) {
      const adminResult = await pool.query(
        `SELECT id, username FROM admins WHERE id = $1`,
        [userId]
      );
      if (adminResult.rows.length > 0) {
        userResult = {
          rows: [{
            id: adminResult.rows[0].id.toString(),
            full_name: adminResult.rows[0].username,
            email: 'admin@reonenergy.in',
            mobile: '',
            avatar_url: null,
            is_active: true,
            roles: ['super_admin'],
            permissions: [
              'users.create', 'users.read', 'users.update', 'users.delete',
              'partners.create', 'partners.read', 'partners.update', 'partners.approve',
              'leads.create', 'leads.read', 'leads.read_all', 'leads.update', 'leads.delete', 'leads.assign',
              'commissions.read', 'commissions.manage', 'payouts.read', 'payouts.process',
              'marketing.read', 'marketing.manage', 'analytics.read', 'analytics.read_all',
              'admin.access', 'audit.read'
            ]
          }]
        };
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      mobile: user.mobile,
      avatarUrl: user.avatar_url,
      roles: user.roles || [],
      permissions: user.permissions || [],
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Require specific roles (OR logic).
 * Usage: requireRole('super_admin', 'sales_manager')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasRole = req.user.roles.some((r) => roles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient role privileges' });
    }

    next();
  };
}

/**
 * Require specific permissions (OR logic).
 * Usage: requirePermission('leads.create', 'leads.update')
 */
export function requirePermission(...perms) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Super admin bypasses permission checks
    if (req.user.roles.includes('super_admin')) {
      return next();
    }

    const hasPermission = req.user.permissions.some((p) => perms.includes(p));
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Optional auth — sets req.user if token is present, but doesn't reject.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    const result = await pool.query(
      'SELECT id, full_name, email, mobile FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = {
        id: result.rows[0].id,
        fullName: result.rows[0].full_name,
        email: result.rows[0].email,
        mobile: result.rows[0].mobile,
      };
    }
  } catch {
    // Silently ignore invalid tokens for optional auth
  }

  next();
}
