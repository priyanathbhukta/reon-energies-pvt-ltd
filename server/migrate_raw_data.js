import pool from './db.js';

async function migrateQuotations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Adding raw_data to quotations table...');
    await client.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS raw_data JSONB;`);
    console.log('✅ Added raw_data column');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateQuotations();
