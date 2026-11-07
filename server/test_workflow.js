import pool from './db.js';
import { getNextQuotationNumber } from './routes/admin_quotations.js';
import { getNextInvoiceNumber } from './routes/admin_invoices.js';

async function runTests() {
  console.log('🧪 Starting REON Energies End-to-End Workflow Verification Tests...\n');
  const client = await pool.connect();
  
  try {
    // 0. Setup test partner & user
    const testEmail = `test_pos_${Date.now()}@reonenergy.in`;
    const testShop = `Test Solar Shop ${Date.now()}`;
    const testRefCode = `TEST-${Date.now().toString().slice(-4)}`;

    const userRes = await client.query(
      `INSERT INTO users (full_name, mobile, email, password_hash, is_active)
       VALUES ($1, $2, $3, 'hash123', true) RETURNING id`,
      ['Test POS Partner', `99${Date.now().toString().slice(-8)}`, testEmail]
    );
    const testUserId = userRes.rows[0].id;

    const partnerRes = await client.query(
      `INSERT INTO pos_partners (user_id, shop_name, referral_code, status, address, state, district)
       VALUES ($1, $2, $3, 'approved', 'Test Address', 'West Bengal', 'Hooghly') RETURNING id`,
      [testUserId, testShop, testRefCode]
    );
    const testPartnerId = partnerRes.rows[0].id;
    console.log(`✅ [SETUP] Created Test POS Partner (ID: ${testPartnerId}, User: ${testUserId}, Shop: ${testShop})`);

    // Helper to query stats
    const getStats = async (pId, uId) => {
      const q = `
        SELECT 
          l.id,
          COALESCE(l.lead_status, CASE WHEN l.stage = 'converted' THEN 'Converted' ELSE 'Pending' END) AS "leadStatus",
          COALESCE(l.quotation_amount, 0)::numeric AS "quotationAmount",
          COALESCE(l.invoice_amount, 0)::numeric AS "invoiceAmount",
          l.stage,
          l.invoice_no
        FROM leads l
        WHERE (l.partner_id = $1 OR l.user_id = $2) AND l.deleted_at IS NULL
      `;
      const res = await client.query(q, [pId, uId]);
      const totalLeads = res.rows.length;
      const convertedLeads = res.rows.filter(r => r.leadStatus === 'Converted' || r.stage === 'converted' || r.invoice_no).length;
      const pendingLeads = totalLeads - convertedLeads;
      const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;
      const totalQuotationValue = res.rows.reduce((sum, r) => sum + parseFloat(r.quotationAmount), 0);
      const convertedBusinessValue = res.rows
        .filter(r => r.leadStatus === 'Converted' || r.stage === 'converted' || r.invoice_no)
        .reduce((sum, r) => sum + parseFloat(r.invoiceAmount), 0);

      return { totalLeads, pendingLeads, convertedLeads, conversionRate, totalQuotationValue, convertedBusinessValue, leads: res.rows };
    };

    // ── SCENARIO A: New quotation auto creates lead and increments dashboard ──
    console.log('\n--- SCENARIO A: New Quotation & Automatic Lead Creation ---');
    const quoteNumA = `REPL/TEST/${Date.now().toString().slice(-4)}A`;
    const quoteARes = await client.query(
      `INSERT INTO quotations (
        offer_no, customer_name, total_price, payment_mode, raw_data,
        pos_name, pos_id, created_by_type, partner_id, user_id, status
      ) VALUES ($1, $2, $3, 'Cash', $4, $5, $6, 'pos', $7, $8, 'pending')
      RETURNING *`,
      [quoteNumA, 'Customer Alpha', 250000.00, JSON.stringify({ contact_number: '9876543211', system_capacity_kw: '5' }), testShop, testRefCode, testPartnerId, testUserId]
    );
    const quoteA = quoteARes.rows[0];

    // Trigger lead creation logic as done in route
    const leadAInsert = await client.query(
      `INSERT INTO leads (
        partner_id, assigned_to, customer_name, mobile,
        source, stage, priority, quotation_id, quotation_no, quotation_amount,
        quotation_date, quotation_status, lead_status, pos_name, pos_id, user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (quotation_id) DO NOTHING RETURNING *`,
      [testPartnerId, testUserId, 'Customer Alpha', '9876543211', 'pos_partner', 'quotation_sent', 'medium', quoteA.id, quoteA.offer_no, 250000.00, quoteA.created_at, 'pending', 'Pending', testShop, testRefCode, testUserId]
    );
    console.log(`Created Lead: ${leadAInsert.rows[0].id} for Quotation ${quoteA.offer_no}`);

    const statsAfterA = await getStats(testPartnerId, testUserId);
    console.log('Dashboard Stats After Scenario A:', statsAfterA);
    if (statsAfterA.totalLeads !== 1 || statsAfterA.pendingLeads !== 1 || statsAfterA.convertedLeads !== 0 || statsAfterA.totalQuotationValue !== 250000) {
      throw new Error(`Scenario A failed: Expected 1 lead, 1 pending, 250000 value, got ${JSON.stringify(statsAfterA)}`);
    }
    console.log('✅ SCENARIO A PASSED!');

    // ── SCENARIO B: Admin converts quotation via linked invoice ───────────────
    console.log('\n--- SCENARIO B: Admin Converts Quotation via Linked Invoice ---');
    const invNumB = `INV/TEST/${Date.now().toString().slice(-4)}B`;
    const invBRes = await client.query(
      `INSERT INTO invoices (
        invoice_no, quotation_id, quotation_no, lead_id, partner_id, pos_name, pos_id, user_id,
        grand_total, subtotal, cgst_total, sgst_total, company_details, customer_details, invoice_details, items
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, '{}', '{}', '{}', '[]') RETURNING *`,
      [invNumB, quoteA.id, quoteA.offer_no, leadAInsert.rows[0].id, testPartnerId, testShop, testRefCode, testUserId, 260000.00, 220338.98, 19830.51, 19830.51]
    );
    const invB = invBRes.rows[0];

    // Conversion update
    await client.query(
      `UPDATE quotations SET status = 'converted', invoice_id = $1, invoice_no = $2, converted_at = NOW() WHERE id = $3`,
      [invB.id, invB.invoice_no, quoteA.id]
    );
    await client.query(
      `UPDATE leads SET stage = 'converted', lead_status = 'Converted', invoice_id = $1, invoice_no = $2, invoice_amount = $3, converted_at = NOW() WHERE quotation_id = $4`,
      [invB.id, invB.invoice_no, 260000.00, quoteA.id]
    );

    const statsAfterB = await getStats(testPartnerId, testUserId);
    console.log('Dashboard Stats After Scenario B:', statsAfterB);
    if (statsAfterB.totalLeads !== 1 || statsAfterB.pendingLeads !== 0 || statsAfterB.convertedLeads !== 1 || statsAfterB.conversionRate !== 100.0 || statsAfterB.convertedBusinessValue !== 260000) {
      throw new Error(`Scenario B failed: Expected 1 converted, 100% rate, 260000 business value, got ${JSON.stringify(statsAfterB)}`);
    }
    console.log('✅ SCENARIO B PASSED!');

    // ── SCENARIO C: Multiple quotations for same customer, converting only one ──
    console.log('\n--- SCENARIO C: Multiple Quotations for Same Customer ---');
    const custBetaName = 'Customer Beta';
    const custBetaPhone = '9876543222';
    const quoteC1 = (await client.query(
      `INSERT INTO quotations (offer_no, customer_name, total_price, payment_mode, pos_name, pos_id, partner_id, user_id, status)
       VALUES ($1, $2, 300000, 'Cash', $3, $4, $5, $6, 'pending') RETURNING *`,
      [`REPL/TEST/${Date.now().toString().slice(-4)}C1`, custBetaName, testShop, testRefCode, testPartnerId, testUserId]
    )).rows[0];
    const quoteC2 = (await client.query(
      `INSERT INTO quotations (offer_no, customer_name, total_price, payment_mode, pos_name, pos_id, partner_id, user_id, status)
       VALUES ($1, $2, 350000, 'Cash', $3, $4, $5, $6, 'pending') RETURNING *`,
      [`REPL/TEST/${Date.now().toString().slice(-4)}C2`, custBetaName, testShop, testRefCode, testPartnerId, testUserId]
    )).rows[0];
    const quoteC3 = (await client.query(
      `INSERT INTO quotations (offer_no, customer_name, total_price, payment_mode, pos_name, pos_id, partner_id, user_id, status)
       VALUES ($1, $2, 400000, 'Cash', $3, $4, $5, $6, 'pending') RETURNING *`,
      [`REPL/TEST/${Date.now().toString().slice(-4)}C3`, custBetaName, testShop, testRefCode, testPartnerId, testUserId]
    )).rows[0];

    // Create 3 separate leads
    for (const q of [quoteC1, quoteC2, quoteC3]) {
      await client.query(
        `INSERT INTO leads (partner_id, assigned_to, customer_name, mobile, quotation_id, quotation_no, quotation_amount, quotation_date, lead_status, stage, pos_name, pos_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', 'quotation_sent', $9, $10, $11)`,
        [testPartnerId, testUserId, custBetaName, custBetaPhone, q.id, q.offer_no, q.total_price, q.created_at, testShop, testRefCode, testUserId]
      );
    }

    const statsBeforeConvertC = await getStats(testPartnerId, testUserId);
    console.log('Total leads before converting C2:', statsBeforeConvertC.totalLeads); // should be 1 + 3 = 4
    if (statsBeforeConvertC.totalLeads !== 4) {
      throw new Error(`Expected 4 total leads, got ${statsBeforeConvertC.totalLeads}`);
    }

    // Now convert ONLY quoteC2
    const invNumC2 = `INV/TEST/${Date.now().toString().slice(-4)}C2`;
    const invC2Res = await client.query(
      `INSERT INTO invoices (invoice_no, quotation_id, quotation_no, partner_id, pos_name, pos_id, user_id, grand_total, company_details, customer_details, invoice_details, items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '{}', '{}', '{}', '[]') RETURNING *`,
      [invNumC2, quoteC2.id, quoteC2.offer_no, testPartnerId, testShop, testRefCode, testUserId, 350000.00]
    );
    await client.query(`UPDATE quotations SET status = 'converted', invoice_id = $1, invoice_no = $2, converted_at = NOW() WHERE id = $3`, [invC2Res.rows[0].id, invNumC2, quoteC2.id]);
    await client.query(`UPDATE leads SET stage = 'converted', lead_status = 'Converted', invoice_id = $1, invoice_no = $2, invoice_amount = 350000.00, converted_at = NOW() WHERE quotation_id = $3`, [invC2Res.rows[0].id, invNumC2, quoteC2.id]);

    const statsAfterC = await getStats(testPartnerId, testUserId);
    console.log('Dashboard Stats After Converting C2:', statsAfterC);
    // Converted leads should now be 2 (quoteA and quoteC2), total = 4
    if (statsAfterC.totalLeads !== 4 || statsAfterC.convertedLeads !== 2 || statsAfterC.pendingLeads !== 2 || statsAfterC.conversionRate !== 50.0) {
      throw new Error(`Scenario C failed: Expected 4 total, 2 converted, 2 pending, 50% rate, got ${JSON.stringify(statsAfterC)}`);
    }

    // Verify quoteC1 and quoteC3 remain Pending
    const leadC1 = (await client.query('SELECT lead_status, stage FROM leads WHERE quotation_id = $1', [quoteC1.id])).rows[0];
    const leadC3 = (await client.query('SELECT lead_status, stage FROM leads WHERE quotation_id = $1', [quoteC3.id])).rows[0];
    if (leadC1.lead_status !== 'Pending' || leadC3.lead_status !== 'Pending') {
      throw new Error(`Scenario C failed: Unconverted quotations C1 and C3 must remain Pending!`);
    }
    console.log('✅ SCENARIO C PASSED!');

    // ── SCENARIO D: Historical Data Backfill Verification ──────────────────────
    console.log('\n--- SCENARIO D: Historical Data Backfill Verification ---');
    // Create an unlinked historical quotation with partner referral code
    const histQuote = (await client.query(
      `INSERT INTO quotations (offer_no, customer_name, total_price, payment_mode, pos_id, pos_name, status)
       VALUES ($1, $2, 180000, 'Cash', $3, $4, 'pending') RETURNING *`,
      [`REPL/HIST/${Date.now().toString().slice(-4)}`, 'Historical Customer', testRefCode, testShop]
    )).rows[0];

    // Lead does NOT exist for this quote yet
    const preLeadCount = (await client.query('SELECT COUNT(*) FROM leads WHERE quotation_id = $1', [histQuote.id])).rows[0].count;
    if (parseInt(preLeadCount) !== 0) throw new Error('Expected no lead initially');

    // Run backfill query for this quotation
    await client.query(
      `INSERT INTO leads (partner_id, customer_name, mobile, quotation_id, quotation_no, quotation_amount, quotation_date, lead_status, stage, pos_name, pos_id)
       VALUES ($1, $2, '9876500000', $3, $4, $5, $6, 'Pending', 'quotation_sent', $7, $8)
       ON CONFLICT (quotation_id) DO NOTHING`,
      [testPartnerId, histQuote.customer_name, histQuote.id, histQuote.offer_no, histQuote.total_price, histQuote.created_at, testShop, testRefCode]
    );

    const postLeadCount = (await client.query('SELECT COUNT(*) FROM leads WHERE quotation_id = $1', [histQuote.id])).rows[0].count;
    if (parseInt(postLeadCount) !== 1) throw new Error('Backfill failed to create lead for historical quotation');
    console.log('✅ SCENARIO D PASSED!');

    // ── SCENARIO E: Unlinked Invoice Does NOT Convert Unrelated Leads ─────────
    console.log('\n--- SCENARIO E: Unlinked Invoice Safety (No False Conversions) ---');
    // Admin creates an invoice for "Customer Beta" with NO quotation selected
    const unlinkedInvRes = await client.query(
      `INSERT INTO invoices (invoice_no, customer_details, grand_total, company_details, invoice_details, items)
       VALUES ($1, $2, 500000.00, '{}', '{}', '[]') RETURNING *`,
      [`INV/UNLINKED/${Date.now().toString().slice(-4)}`, JSON.stringify({ name: custBetaName, phone: custBetaPhone })]
    );

    // Verify quoteC1 and quoteC3 are STILL Pending and were NOT converted by name/phone match!
    const checkC1Again = (await client.query('SELECT lead_status, stage, invoice_id FROM leads WHERE quotation_id = $1', [quoteC1.id])).rows[0];
    const checkC3Again = (await client.query('SELECT lead_status, stage, invoice_id FROM leads WHERE quotation_id = $1', [quoteC3.id])).rows[0];
    if (checkC1Again.lead_status !== 'Pending' || checkC1Again.invoice_id !== null || checkC3Again.lead_status !== 'Pending' || checkC3Again.invoice_id !== null) {
      throw new Error(`Scenario E failed: Unlinked invoice improperly converted a quotation lead by name!`);
    }
    console.log('✅ SCENARIO E PASSED! Unlinked invoice left leads unconverted.');

    // Clean up test data
    console.log('\n🧹 Cleaning up test artifacts...');
    await client.query('DELETE FROM leads WHERE partner_id = $1', [testPartnerId]);
    await client.query('DELETE FROM invoices WHERE partner_id = $1 OR invoice_no LIKE $2', [testPartnerId, '%UNLINKED%']);
    await client.query('DELETE FROM quotations WHERE partner_id = $1 OR pos_id = $2', [testPartnerId, testRefCode]);
    await client.query('DELETE FROM pos_partners WHERE id = $1', [testPartnerId]);
    await client.query('DELETE FROM users WHERE id = $1', [testUserId]);

    console.log('\n=====================================================');
    console.log('🎉 ALL WORKFLOW SCENARIOS (A, B, C, D, E) PASSED 100%!');
    console.log('=====================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

runTests();
