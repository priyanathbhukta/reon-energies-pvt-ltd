import pool from './db.js';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Alter quotations table to support partner tracking
    console.log('Adding user_id and partner_id columns to quotations table...');
    await client.query(`
      ALTER TABLE quotations 
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES pos_partners(id) ON DELETE SET NULL;
    `);

    // 2. Identify the test POS partner (email: pos.partner@reonenergy.in)
    const partnerRes = await client.query(`
      SELECT pp.id as partner_id, u.id as user_id 
      FROM pos_partners pp 
      JOIN users u ON pp.user_id = u.id 
      WHERE u.email = 'pos.partner@reonenergy.in'
    `);

    if (partnerRes.rows.length > 0) {
      const { partner_id, user_id } = partnerRes.rows[0];
      console.log(`Found test POS partner: id=${partner_id}, user_id=${user_id}`);

      // Delete related records to avoid constraint violations
      console.log('Deleting related data for test POS...');
      
      // Payouts
      await client.query('DELETE FROM payouts WHERE partner_id = $1', [partner_id]);
      
      // Wallet transactions
      const walletRes = await client.query('SELECT id FROM wallets WHERE partner_id = $1', [partner_id]);
      if (walletRes.rows.length > 0) {
        const walletId = walletRes.rows[0].id;
        await client.query('DELETE FROM wallet_transactions WHERE wallet_id = $1', [walletId]);
      }
      
      // Wallets
      await client.query('DELETE FROM wallets WHERE partner_id = $1', [partner_id]);
      
      // Commissions
      await client.query('DELETE FROM commissions WHERE partner_id = $1', [partner_id]);
      
      // Leads
      await client.query('DELETE FROM leads WHERE partner_id = $1', [partner_id]);
      
      // pos_tickets
      await client.query('DELETE FROM pos_tickets WHERE partner_id = $1', [partner_id]);

      // partner_documents
      await client.query('DELETE FROM partner_documents WHERE partner_id = $1', [partner_id]);
      
      // partner_bank_details
      await client.query('DELETE FROM partner_bank_details WHERE partner_id = $1', [partner_id]);

      // partner_regions
      await client.query('DELETE FROM partner_regions WHERE partner_id = $1', [partner_id]);

      // Finally, delete from pos_partners and users
      await client.query('DELETE FROM pos_partners WHERE id = $1', [partner_id]);
      
      // Delete user_roles
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [user_id]);
      
      // Delete users
      await client.query('DELETE FROM users WHERE id = $1', [user_id]);

      console.log('✅ Test POS partner deleted successfully');
    } else {
      console.log('No test POS partner found with email pos.partner@reonenergy.in');
    }

    await client.query('COMMIT');
    console.log('🎉 Migration successful!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
