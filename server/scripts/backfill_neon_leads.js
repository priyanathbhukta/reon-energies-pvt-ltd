import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

async function backfill() {
  console.log('🚀 Starting backfill of quotations, leads, and invoices on Neon...');
  const client = await pool.connect();

  try {
    // 1. Fetch all partners
    const partnersRes = await client.query(`
      SELECT p.id, p.shop_name, p.referral_code, p.user_id, u.full_name, u.mobile, u.email
      FROM pos_partners p
      JOIN users u ON p.user_id = u.id
    `);
    const partners = partnersRes.rows;
    console.log(`Loaded ${partners.length} POS partners.`);

    const partnerByCode = new Map();
    const partnerByShop = new Map();
    for (const p of partners) {
      if (p.referral_code) partnerByCode.set(p.referral_code.toUpperCase(), p);
      if (p.shop_name) partnerByShop.set(normalizeName(p.shop_name), p);
    }

    // 2. Fetch all invoices
    const invoicesRes = await client.query(`
      SELECT 
        id, invoice_no, grand_total, created_at,
        customer_details->>'name' as cust_name,
        customer_details->>'phone' as cust_phone,
        quotation_no, quotation_id
      FROM invoices
      ORDER BY id ASC
    `);
    const invoices = invoicesRes.rows;
    console.log(`Loaded ${invoices.length} invoices.`);

    // 3. Fetch all quotations
    const quotesRes = await client.query(`
      SELECT 
        id, offer_no, customer_name, total_price, pos_name, pos_id, 
        partner_id, user_id, raw_data, created_at, status, invoice_id, invoice_no
      FROM quotations
      ORDER BY id ASC
    `);
    const quotes = quotesRes.rows;
    console.log(`Loaded ${quotes.length} quotations.`);

    let createdCount = 0;
    let convertedCount = 0;
    let partnerMatchedCount = 0;

    for (const q of quotes) {
      const raw = q.raw_data || {};
      const customerName = (q.customer_name || raw.customer_name || 'Customer').trim();
      const mobile = (raw.contact_number || raw.phone || raw.mobile || '').trim();
      const email = raw.email ? raw.email.trim() : null;
      const address = raw.address ? raw.address.trim() : null;
      const state = raw.state || 'West Bengal';

      let rawKw = raw.system_capacity_kw || raw.capacity || '0';
      if (typeof rawKw === 'string') rawKw = rawKw.replace(/[^0-9.]/g, '');
      let estimatedKw = parseFloat(rawKw) || 0;
      if (estimatedKw > 1000) estimatedKw = estimatedKw / 1000;
      if (isNaN(estimatedKw)) estimatedKw = 0;

      let quotationAmount = parseFloat(q.total_price) || 0;
      if (isNaN(quotationAmount)) quotationAmount = 0;
      const quotationDate = q.created_at;
      const quotationNo = q.offer_no;

      // Match partner
      let partnerId = q.partner_id;
      let userId = q.user_id;
      let posName = q.pos_name || 'admin';
      let posId = q.pos_id || null;

      if (!partnerId && posId && partnerByCode.has(posId.toUpperCase())) {
        const p = partnerByCode.get(posId.toUpperCase());
        partnerId = p.id;
        userId = p.user_id;
        posName = p.shop_name;
        posId = p.referral_code;
      } else if (!partnerId && posName && partnerByShop.has(normalizeName(posName))) {
        const p = partnerByShop.get(normalizeName(posName));
        partnerId = p.id;
        userId = p.user_id;
        posName = p.shop_name;
        posId = p.referral_code;
      }

      if (partnerId) {
        partnerMatchedCount++;
        // Update quotation partner linkage
        await client.query(`
          UPDATE quotations 
          SET partner_id = $1, user_id = $2, pos_name = $3, pos_id = $4 
          WHERE id = $5
        `, [partnerId, userId, posName, posId, q.id]);
      }

      // Check if any invoice matches this quotation
      let matchedInv = null;
      for (const inv of invoices) {
        if (inv.quotation_no && quotationNo && inv.quotation_no.trim() === quotationNo.trim()) {
          matchedInv = inv;
          break;
        }
        if (inv.quotation_id && inv.quotation_id === q.id) {
          matchedInv = inv;
          break;
        }
        // Specific historical match: SK ISMAIL (REPL/26-27/121) <-> INV/26-27/001
        if (quotationNo === 'REPL/26-27/121' && inv.invoice_no === 'INV/26-27/001') {
          matchedInv = inv;
          break;
        }
      }

      let leadStatus = 'Pending';
      let stage = 'quotation_sent';
      let invoiceId = null;
      let invoiceNo = null;
      let invoiceAmount = 0;
      let convertedAt = null;

      if (matchedInv) {
        leadStatus = 'Converted';
        stage = 'converted';
        invoiceId = matchedInv.id;
        invoiceNo = matchedInv.invoice_no;
        invoiceAmount = parseFloat(matchedInv.grand_total) || 0;
        convertedAt = matchedInv.created_at;
        convertedCount++;

        // Update quotation
        await client.query(`
          UPDATE quotations
          SET status = 'converted', invoice_id = $1, invoice_no = $2, converted_at = $3
          WHERE id = $4
        `, [invoiceId, invoiceNo, convertedAt, q.id]);

        // Update invoice
        await client.query(`
          UPDATE invoices
          SET quotation_id = $1, quotation_no = $2, partner_id = $3, pos_name = $4, pos_id = $5, user_id = $6
          WHERE id = $7
        `, [q.id, quotationNo, partnerId, posName, posId, userId, invoiceId]);
      }

      // Upsert lead record
      const leadId = crypto.randomUUID();
      await client.query(`
        INSERT INTO leads (
          id,
          customer_name,
          mobile,
          email,
          address,
          state,
          estimated_kw,
          quotation_id,
          quotation_no,
          quotation_amount,
          quotation_date,
          quotation_status,
          lead_status,
          stage,
          pos_name,
          pos_id,
          partner_id,
          user_id,
          invoice_id,
          invoice_no,
          invoice_amount,
          converted_at,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, NOW()
        )
        ON CONFLICT (quotation_id) WHERE quotation_id IS NOT NULL DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          mobile = COALESCE(NULLIF(EXCLUDED.mobile, ''), leads.mobile),
          email = COALESCE(EXCLUDED.email, leads.email),
          address = COALESCE(EXCLUDED.address, leads.address),
          state = COALESCE(EXCLUDED.state, leads.state),
          estimated_kw = EXCLUDED.estimated_kw,
          quotation_no = EXCLUDED.quotation_no,
          quotation_amount = EXCLUDED.quotation_amount,
          quotation_date = EXCLUDED.quotation_date,
          quotation_status = EXCLUDED.quotation_status,
          lead_status = EXCLUDED.lead_status,
          stage = EXCLUDED.stage,
          pos_name = EXCLUDED.pos_name,
          pos_id = EXCLUDED.pos_id,
          partner_id = EXCLUDED.partner_id,
          user_id = EXCLUDED.user_id,
          invoice_id = EXCLUDED.invoice_id,
          invoice_no = EXCLUDED.invoice_no,
          invoice_amount = EXCLUDED.invoice_amount,
          converted_at = EXCLUDED.converted_at;
      `, [
        leadId,
        customerName,
        mobile,
        email,
        address,
        state,
        estimatedKw,
        q.id,
        quotationNo,
        quotationAmount,
        quotationDate,
        leadStatus === 'Converted' ? 'converted' : 'pending',
        leadStatus,
        stage,
        posName,
        posId,
        partnerId,
        userId,
        invoiceId,
        invoiceNo,
        invoiceAmount,
        convertedAt,
        q.created_at
      ]);

      createdCount++;
    }

    console.log(`\n🎉 Backfill summary:`);
    console.log(`- Quotations processed: ${createdCount}`);
    console.log(`- POS partner links resolved: ${partnerMatchedCount}`);
    console.log(`- Quotations converted with invoices: ${convertedCount}`);

    // Verify lead count in database
    const countRes = await client.query('SELECT count(*) as count FROM leads');
    console.log(`- Total leads now in database: ${countRes.rows[0].count}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

backfill();
