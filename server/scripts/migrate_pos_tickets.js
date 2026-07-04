import pool from '../src/config/database.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Adding pos_id to pos_partners...');
    await client.query(`
      ALTER TABLE pos_partners 
      ADD COLUMN IF NOT EXISTS pos_id VARCHAR(50) UNIQUE;
    `);

    console.log('Creating pos_tickets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pos_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID REFERENCES pos_partners(id) ON DELETE CASCADE,
        ticket_type VARCHAR(50) NOT NULL,
        requested_data JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Migration successful!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
