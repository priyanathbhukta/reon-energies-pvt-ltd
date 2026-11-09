import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';

const router = express.Router();

// ── Helper: Generate Payment Reference ──────────────────────────────────
async function generatePaymentReference() {
  const year = new Date().getFullYear();
  const countRes = await pool.query("SELECT COUNT(*) FROM invoice_payments WHERE payment_reference LIKE $1", [`PAY-${year}-%`]);
  const seq = parseInt(countRes.rows[0].count, 10) + 1;
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PAY-${year}-${String(seq).padStart(3, '0')}-${rand}`;
}

// ── Helper: Recalculate Invoice Payment Totals & Status ──────────────────
export async function recalculateInvoicePaymentStatus(client, invoiceId) {
  const invRes = await client.query('SELECT grand_total FROM invoices WHERE id = $1', [invoiceId]);
  if (invRes.rows.length === 0) return null;

  const grandTotal = parseFloat(invRes.rows[0].grand_total || 0);

  const sumRes = await client.query(
    "SELECT COALESCE(SUM(amount_received), 0) as total FROM invoice_payments WHERE invoice_id = $1 AND status = 'confirmed'",
    [invoiceId]
  );
  const totalReceived = parseFloat(sumRes.rows[0].total || 0);
  const outstandingAmount = Math.max(0, parseFloat((grandTotal - totalReceived).toFixed(2)));

  let paymentStatus = 'unpaid';
  if (totalReceived > 0) {
    if (Math.abs(totalReceived - grandTotal) < 0.01) {
      paymentStatus = 'paid';
    } else if (totalReceived < grandTotal) {
      paymentStatus = 'partially_paid';
    } else {
      paymentStatus = 'overpaid';
    }
  }

  await client.query(`
    UPDATE invoices
    SET total_received = $1,
        outstanding_amount = $2,
        payment_status = $3,
        updated_at = NOW()
    WHERE id = $4
  `, [totalReceived, outstandingAmount, paymentStatus, invoiceId]);

  return { grandTotal, totalReceived, outstandingAmount, paymentStatus };
}

// ── POST /api/admin/invoices/:id/payments ─────────────────────────────────
// Record a received payment against an original tax invoice
router.post('/invoices/:id/payments', async (req, res) => {
  const { id } = req.params;
  const {
    payment_date,
    payment_method,
    amount_received,
    transaction_reference,
    bank_reference,
    remarks,
    attachment_url,
  } = req.body;

  const amount = parseFloat(amount_received);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Valid payment amount greater than zero is required.' });
  }

  if (!payment_date) {
    return res.status(400).json({ error: 'Payment date is required.' });
  }

  if (!payment_method) {
    return res.status(400).json({ error: 'Payment method is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invRes = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    const invoice = invRes.rows[0];

    const customerDetails = typeof invoice.customer_details === 'string'
      ? JSON.parse(invoice.customer_details)
      : (invoice.customer_details || {});

    const customerName = customerDetails.name || invoice.pos_name || 'Customer';
    const paymentRef = await generatePaymentReference();
    const recordedBy = req.user?.username || req.user?.full_name || 'Admin';

    // Insert payment record
    const insertQuery = `
      INSERT INTO invoice_payments (
        payment_reference, invoice_id, quotation_id, customer_name,
        payment_date, payment_method, amount_received, transaction_reference,
        bank_reference, remarks, attachment_url, status, recorded_by,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'confirmed',$12,NOW(),NOW())
      RETURNING *;
    `;
    const insertValues = [
      paymentRef,
      invoice.id,
      invoice.quotation_id || null,
      customerName,
      payment_date,
      payment_method,
      amount,
      transaction_reference || null,
      bank_reference || null,
      remarks || null,
      attachment_url || null,
      recordedBy,
    ];

    const paymentResult = await client.query(insertQuery, insertValues);
    const createdPayment = paymentResult.rows[0];

    // Recalculate totals
    const summary = await recalculateInvoicePaymentStatus(client, invoice.id);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Payment of ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded successfully.`,
      payment: createdPayment,
      invoiceSummary: summary,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Record payment error:', err);
    res.status(500).json({ error: 'Failed to record payment', details: err.message });
  } finally {
    client.release();
  }
});

// ── GET /api/admin/invoices/:id/payments ──────────────────────────────────
// List all payments associated with an invoice
router.get('/invoices/:id/payments', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM invoice_payments WHERE invoice_id = $1 ORDER BY payment_date DESC, created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/payments/:id/reverse ──────────────────────────────────
// Reverse or cancel an incorrect payment with a mandatory reason
router.post('/payments/:id/reverse', async (req, res) => {
  const { id } = req.params;
  const { reversal_reason } = req.body;

  if (!reversal_reason || !reversal_reason.trim()) {
    return res.status(400).json({ error: 'A mandatory reversal reason must be provided.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const payRes = await client.query('SELECT * FROM invoice_payments WHERE id = $1', [id]);
    if (payRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    const payment = payRes.rows[0];
    if (payment.status === 'reversed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Payment is already reversed.' });
    }

    const reversedBy = req.user?.username || req.user?.full_name || 'Admin';

    await client.query(`
      UPDATE invoice_payments
      SET status = 'reversed',
          reversal_reason = $1,
          reversed_at = NOW(),
          reversed_by = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [reversal_reason.trim(), reversedBy, id]);

    // Recalculate totals
    const summary = await recalculateInvoicePaymentStatus(client, payment.invoice_id);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payment reversed successfully. Outstanding balance recalculated.',
      invoiceSummary: summary,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reverse payment error:', err);
    res.status(500).json({ error: 'Failed to reverse payment', details: err.message });
  } finally {
    client.release();
  }
});

// ── PUT /api/admin/payments/:id ───────────────────────────────────────────
// Edit remarks or references on a payment with audit
router.put('/payments/:id', async (req, res) => {
  const { id } = req.params;
  const { remarks, transaction_reference, bank_reference } = req.body;

  try {
    const result = await pool.query(`
      UPDATE invoice_payments
      SET remarks = COALESCE($1, remarks),
          transaction_reference = COALESCE($2, transaction_reference),
          bank_reference = COALESCE($3, bank_reference),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `, [remarks, transaction_reference, bank_reference, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    res.json({ success: true, payment: result.rows[0] });
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
