// backend/routes/quotations.js
// REST API — /api/quotations
'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const svc     = require('../services/quotationService');

// ── Validation helper ─────────────────────────────────────────────────────────
function validate(body) {
  const errors = [];
  if (!body.customer_name?.trim())
    errors.push('customer_name is required');
  if (!body.capacity?.trim())
    errors.push('capacity is required');
  if (!body.total_price?.toString().trim())
    errors.push('total_price is required');
  return errors;
}

// ── POST /api/quotations  — Create & generate PDF ─────────────────────────────
router.post('/', async (req, res) => {
  const errors = validate(req.body);
  if (errors.length)
    return res.status(400).json({ success: false, errors });

  try {
    const quotation = await svc.createQuotation({
      ...req.body,
      created_by: req.user?.id || null,
    });
    return res.status(201).json({ success: true, data: quotation });
  } catch (err) {
    console.error('[POST /quotations]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/quotations  — List (paginated + search) ──────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await svc.listQuotations({
      page:   parseInt(req.query.page   || '1'),
      limit:  parseInt(req.query.limit  || '20'),
      search: req.query.search || '',
      status: req.query.status || '',
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[GET /quotations]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/quotations/:id  — Get single quotation ───────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const quotation = await svc.getQuotation(parseInt(req.params.id));
    return res.json({ success: true, data: quotation });
  } catch (err) {
    if (err.message === 'Quotation not found')
      return res.status(404).json({ success: false, error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/quotations/:id  — Update quotation fields ──────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const updated = await svc.updateQuotation(parseInt(req.params.id), req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    if (err.message === 'Quotation not found')
      return res.status(404).json({ success: false, error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/quotations/:id/regenerate  — Re-generate PDF ────────────────────
router.post('/:id/regenerate', async (req, res) => {
  try {
    const updated = await svc.regeneratePDF(parseInt(req.params.id));
    return res.json({ success: true, data: updated });
  } catch (err) {
    if (err.message === 'Quotation not found')
      return res.status(404).json({ success: false, error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/quotations/:id/download  — Stream PDF to browser ─────────────────
router.get('/:id/download', async (req, res) => {
  try {
    const quotation = await svc.getQuotation(parseInt(req.params.id));

    if (!quotation.pdf_path || !fs.existsSync(quotation.pdf_path)) {
      // Try to regenerate on the fly
      try {
        const regen = await svc.regeneratePDF(parseInt(req.params.id));
        quotation.pdf_path = regen.pdf_path;
      } catch {
        return res.status(404).json({ success: false, error: 'PDF not found. Try regenerating.' });
      }
    }

    const filename = path.basename(quotation.pdf_path);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(quotation.pdf_path).pipe(res);
  } catch (err) {
    console.error('[GET /quotations/:id/download]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/quotations/:id  — Delete quotation + PDF ──────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await svc.deleteQuotation(parseInt(req.params.id));
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    if (err.message === 'Quotation not found')
      return res.status(404).json({ success: false, error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
