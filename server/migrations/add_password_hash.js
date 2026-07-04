/**
 * Migration: Add password_hash column to users table
 * 
 * Run: node server/migrations/add_password_hash.js
 * 
 * This is safe to run multiple times (uses IF NOT EXISTS).
 */

import pool from '../src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const client = await pool.connect();
  console.log('🔧 Running migration: add password_hash to users table...\n');

  try {
    await client.query('BEGIN');

    // Add password_hash column if it doesn't exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);
    console.log('  ✅ Added column: users.password_hash');

    // Add updated_at column if it doesn't exist (for tracking)
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log('  ✅ Added column: users.updated_at (if missing)');

    // Add last_login_at column if it doesn't exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    `);
    console.log('  ✅ Added column: users.last_login_at (if missing)');

    // Add is_active column if it doesn't exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);
    console.log('  ✅ Added column: users.is_active (if missing)');

    // Update pos_partners status enum to include 'pending_onboarding'
    // This is safe — if the type already has it, it will be a no-op
    try {
      await client.query(`
        ALTER TYPE partner_status ADD VALUE IF NOT EXISTS 'pending_onboarding';
      `);
      console.log('  ✅ Added enum value: partner_status.pending_onboarding');
    } catch (enumErr) {
      // If partner_status is a plain text column (not an enum), this is fine
      console.log('  ℹ️  partner_status is not a custom enum type — skipping enum migration');
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
