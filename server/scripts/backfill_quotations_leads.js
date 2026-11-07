import pool from '../db.js';

async function backfill() {
  console.log('=====================================================');
  console.log('🔄 STARTING QUOTATION & LEAD BACKFILL MIGRATION');
  console.log('=====================================================\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch all partners for memory lookup
    const partnersRes = await client.query(`
      SELECT p.id, p.user_id, p.shop_name, p.referral_code, u.full_name, u.email, u.mobile
      FROM pos_partners p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.deleted_at IS NULL;
    `);
    const partners = partnersRes.rows;
    console.log(`Found ${partners.length} active POS Partners in DB.`);

    // Helper to find partner
    const findPartner = (partnerId, userId, posId, posName, rawData) => {
      if (partnerId) {
        const match = partners.find(p => p.id === partnerId);
        if (match) return match;
      }
      if (userId) {
        const match = partners.find(p => p.user_id === userId);
        if (match) return match;
      }
      if (posId) {
        const match = partners.find(p => p.referral_code === posId || p.id === posId);
        if (match) return match;
      }
      if (posName && posName.toLowerCase() !== 'admin') {
        const match = partners.find(p => 
          (p.shop_name && p.shop_name.toLowerCase() === posName.toLowerCase()) ||
          (p.full_name && p.full_name.toLowerCase() === posName.toLowerCase())
        );
        if (match) return match;
      }
      if (rawData) {
        const rawObj = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        const candidateId = rawObj.partner_id || rawObj.partnerId || rawObj.userId;
        if (candidateId) {
          const match = partners.find(p => p.id === candidateId || p.user_id === candidateId);
          if (match) return match;
        }
      }
      return null;
    };

    // 2. Fetch all quotations
    const quotationsRes = await client.query(`
      SELECT * FROM quotations ORDER BY created_at ASC;
    `);
    const quotations = quotationsRes.rows;
    console.log(`Found ${quotations.length} total quotations to process.\n`);

    let leadsCreated = 0;
    let leadsUpdated = 0;
    let unmatchedQuotations = [];

    for (const q of quotations) {
      let rawObj = {};
      try {
        rawObj = typeof q.raw_data === 'string' ? JSON.parse(q.raw_data) : (q.raw_data || {});
      } catch (_) {}

      const partner = findPartner(q.partner_id, q.user_id, q.pos_id, q.pos_name, rawObj);
      const partnerId = partner?.id || q.partner_id || null;
      const userId = partner?.user_id || q.user_id || null;
      const posName = partner?.shop_name || q.pos_name || 'admin';
      const posId = partner?.referral_code || q.pos_id || null;
      const isPos = !!partner || (posName.toLowerCase() !== 'admin');

      if (!isPos && (!q.pos_name || q.pos_name === 'admin')) {
        unmatchedQuotations.push({
          quotationId: q.id,
          offerNo: q.offer_no,
          customerName: q.customer_name,
          reason: 'Created by Admin (Direct)',
        });
      }

      // Customer fields extraction
      const customerMobile = (rawObj.contact_number || rawObj.contactNumber || rawObj.mobile || rawObj.phone || 'N/A').toString();
      const customerEmail = rawObj.email || null;
      const customerAddress = rawObj.address || null;
      const custState = rawObj.state || null;
      const custDistrict = rawObj.district || null;
      const custPincode = rawObj.pincode || null;
      const estimatedKw = parseFloat(rawObj.system_capacity_kw || rawObj.capacity || rawObj.solar_capacity || rawObj.kw || 0) || null;
      const validRoofTypes = ['flat', 'sloped', 'metal_sheet', 'rcc', 'other'];
      const roofType = (rawObj.roof_type && validRoofTypes.includes(rawObj.roof_type)) ? rawObj.roof_type : 'other';
      const validPropTypes = ['residential', 'commercial', 'industrial', 'agricultural', 'institutional'];
      const propertyType = (rawObj.property_type && validPropTypes.includes(rawObj.property_type)) ? rawObj.property_type : 'residential';
      const leadSource = isPos ? 'pos_partner' : 'website';
      const leadStage = q.status === 'converted' ? 'converted' : 'quotation_sent';
      const leadStatus = q.status === 'converted' ? 'Converted' : 'Pending';

      // Check if quotation table needs POS fields update
      if ((!q.partner_id && partnerId) || (!q.pos_name && posName) || (!q.pos_id && posId)) {
        await client.query(
          `UPDATE quotations 
           SET partner_id = COALESCE(partner_id, $1),
               user_id = COALESCE(user_id, $2),
               pos_name = COALESCE(pos_name, $3),
               pos_id = COALESCE(pos_id, $4),
               created_by_type = CASE WHEN $5 THEN 'pos' ELSE created_by_type END
           WHERE id = $6`,
          [partnerId, userId, posName, posId, isPos, q.id]
        );
      }

      // Check if lead already exists for quotation
      const leadCheck = await client.query('SELECT id FROM leads WHERE quotation_id = $1', [q.id]);
      if (leadCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO leads (
            partner_id, assigned_to, customer_name, mobile, email, address,
            state, district, pincode, estimated_kw, roof_type, property_type,
            source, stage, priority, quotation_id, quotation_no, quotation_amount,
            quotation_date, quotation_status, lead_status, pos_name, pos_id, user_id,
            created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
          ON CONFLICT (quotation_id) DO NOTHING`,
          [
            partnerId, userId, q.customer_name || 'N/A', customerMobile, customerEmail, customerAddress,
            custState, custDistrict, custPincode, estimatedKw, roofType, propertyType,
            leadSource, leadStage, 'medium', q.id, q.offer_no, q.total_price,
            q.created_at, q.status || 'pending', leadStatus, posName, posId, userId,
            q.created_at
          ]
        );
        leadsCreated++;
      } else {
        await client.query(
          `UPDATE leads
           SET quotation_no = COALESCE(quotation_no, $1),
               quotation_amount = COALESCE(quotation_amount, $2),
               quotation_date = COALESCE(quotation_date, $3),
               pos_name = COALESCE(pos_name, $4),
               pos_id = COALESCE(pos_id, $5),
               partner_id = COALESCE(partner_id, $6),
               user_id = COALESCE(user_id, $7)
           WHERE id = $8`,
          [q.offer_no, q.total_price, q.created_at, posName, posId, partnerId, userId, leadCheck.rows[0].id]
        );
        leadsUpdated++;
      }
    }

    console.log(`✅ Leads created: ${leadsCreated}`);
    console.log(`✅ Leads updated: ${leadsUpdated}`);

    // 3. Scan existing invoices and link to quotations
    const invoicesRes = await client.query('SELECT * FROM invoices ORDER BY created_at ASC;');
    const invoices = invoicesRes.rows;
    console.log(`\nFound ${invoices.length} total invoices to check for quotation linkage.`);

    let invoicesLinked = 0;
    let unmatchedInvoices = [];

    for (const inv of invoices) {
      let matchedQuote = null;

      // Check if invoice already has quotation_id
      if (inv.quotation_id) {
        const qMatch = quotations.find(q => q.id === inv.quotation_id);
        if (qMatch) matchedQuote = qMatch;
      }

      // Check invoice_no or invoice_details for quotation reference
      if (!matchedQuote) {
        let invDetails = {};
        try {
          invDetails = typeof inv.invoice_details === 'string' ? JSON.parse(inv.invoice_details) : (inv.invoice_details || {});
        } catch (_) {}

        const candidateRef = invDetails.quotationNo || invDetails.offerNo || inv.quotation_no;
        if (candidateRef) {
          const qMatch = quotations.find(q => q.offer_no.trim() === candidateRef.trim());
          if (qMatch) matchedQuote = qMatch;
        }

        // Search text in items or company/customer notes for REPL/ pattern
        if (!matchedQuote) {
          const rawInvStr = JSON.stringify(inv);
          const match = rawInvStr.match(/REPL\/[\d-]+\/\d+/i);
          if (match) {
            const matchedOfferNo = match[0];
            const qMatch = quotations.find(q => q.offer_no.toUpperCase() === matchedOfferNo.toUpperCase());
            if (qMatch) matchedQuote = qMatch;
          }
        }
      }

      if (matchedQuote) {
        // Link invoice
        await client.query(
          `UPDATE invoices
           SET quotation_id = $1, quotation_no = $2, partner_id = COALESCE(partner_id, $3),
               pos_name = COALESCE(pos_name, $4), pos_id = COALESCE(pos_id, $5), user_id = COALESCE(user_id, $6)
           WHERE id = $7`,
          [matchedQuote.id, matchedQuote.offer_no, matchedQuote.partner_id, matchedQuote.pos_name, matchedQuote.pos_id, matchedQuote.user_id, inv.id]
        );

        // Mark quotation as converted
        await client.query(
          `UPDATE quotations
           SET status = 'converted', invoice_id = $1, invoice_no = $2, converted_at = $3
           WHERE id = $4`,
          [inv.id, inv.invoice_no, inv.created_at || new Date(), matchedQuote.id]
        );

        // Mark lead as converted
        await client.query(
          `UPDATE leads
           SET stage = 'converted', lead_status = 'Converted', invoice_id = $1, invoice_no = $2,
               invoice_amount = $3, converted_at = $4
           WHERE quotation_id = $5`,
          [inv.id, inv.invoice_no, inv.grand_total, inv.created_at || new Date(), matchedQuote.id]
        );

        invoicesLinked++;
      } else {
        unmatchedInvoices.push({
          invoiceId: inv.id,
          invoiceNo: inv.invoice_no,
          grandTotal: inv.grand_total,
          reason: 'No unique quotation reference found in invoice (admin review recommended)',
        });
      }
    }

    console.log(`✅ Invoices successfully linked: ${invoicesLinked}`);
    if (unmatchedInvoices.length > 0) {
      console.log(`⚠️  Unmatched invoices flagged for manual review: ${unmatchedInvoices.length}`);
    }

    await client.query('COMMIT');
    console.log('\n=====================================================');
    console.log('🎉 BACKFILL COMPLETED SUCCESSFULLY');
    console.log('=====================================================');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

backfill();
