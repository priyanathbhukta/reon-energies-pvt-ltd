import { Router } from 'express';
import pool from '../db.js';
import authMiddleware from '../middleware/auth.js';
import nodemailer from 'nodemailer';

// Configure the SMTP transporter (set these variables in .env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT, // e.g., 587 or 465
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const router = Router();

// POST /api/enquiries — public: create new enquiry
router.post('/', async (req, res) => {
  try {
    const {
      name, phone, email, address, floors,
      monthly_bill, payment_method, installation_type,
      utilities, electricity_provider, message
    } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({ error: 'Name, phone, and address are required.' });
    }

    const result = await pool.query(
      `INSERT INTO enquiries 
        (name, phone, email, address, floors, monthly_bill, payment_method, installation_type, utilities, electricity_provider, message) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        name, phone, email || null, address,
        parseInt(floors) || 1,
        parseFloat(monthly_bill) || 0,
        payment_method || 'Cash',
        installation_type || 'Residential',
        utilities || [],
        electricity_provider || 'WBSEDCL',
        message || null
      ]
    );

    // Send email to support
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        const mailOptions = {
          from: `"REON Website" <${process.env.SMTP_USER}>`,
          to: 'support@reonenergy.in',
          subject: `New Requirement Submitted by ${name}`,
          html: `
            <h2>New Customer Requirement</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Email:</strong> ${email || 'N/A'}</p>
            <p><strong>Address:</strong> ${address}</p>
            <p><strong>Installation Type:</strong> ${installation_type || 'Residential'}</p>
            <p><strong>Electricity Provider:</strong> ${electricity_provider || 'WBSEDCL'}</p>
            <p><strong>Monthly Bill:</strong> ₹${parseFloat(monthly_bill) || 0}</p>
            <p><strong>Message:</strong> ${message || 'N/A'}</p>
            <hr />
            <p>Log in to the REON Admin Dashboard to view full details.</p>
          `
        };
        await transporter.sendMail(mailOptions);
        console.log(`Notification email sent to support@reonenergy.in for customer: ${name}`);
      } else {
        console.warn("SMTP configuration is missing in .env. Support notification email was not sent.");
      }
    } catch (mailErr) {
      console.error('Failed to send notification email:', mailErr.message);
      // Suppress the error so the customer still gets a success message for their submission
    }

    res.status(201).json({ message: 'Enquiry submitted successfully!', enquiry: result.rows[0] });
  } catch (err) {
    console.error('Error creating enquiry:', err.message);
    res.status(500).json({ error: 'Failed to submit enquiry.' });
  }
});

// GET /api/enquiries — admin only: list all enquiries
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, sort } = req.query;
    let query = 'SELECT * FROM enquiries';
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` WHERE status = $${params.length}`;
    }

    query += ` ORDER BY created_at ${sort === 'asc' ? 'ASC' : 'DESC'}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching enquiries:', err.message);
    res.status(500).json({ error: 'Failed to fetch enquiries.' });
  }
});

// PATCH /api/enquiries/:id/status — admin only: update status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'contacted', 'converted', 'lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await pool.query(
      'UPDATE enquiries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating status:', err.message);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// DELETE /api/enquiries/:id — admin only: delete enquiry
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM enquiries WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }

    res.json({ message: 'Enquiry deleted.' });
  } catch (err) {
    console.error('Error deleting enquiry:', err.message);
    res.status(500).json({ error: 'Failed to delete enquiry.' });
  }
});

export default router;
