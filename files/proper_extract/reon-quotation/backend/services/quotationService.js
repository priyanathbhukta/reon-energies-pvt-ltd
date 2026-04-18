// backend/services/quotationService.js
// All database + PDF-generation logic for quotations
'use strict';

const path   = require('path');
const fs     = require('fs');
const { execFile } = require('child_process');
const { pool }     = require('../db');

// ── Paths ─────────────────────────────────────────────────────────────────────
const PDF_GEN_SCRIPT = path.join(__dirname, 'run_pdf_gen.py');
const PDF_OUT_DIR    = process.env.PDF_OUTPUT_DIR
                       || path.join(__dirname, '../../generated_pdfs');

// Ensure output directory exists
fs.mkdirSync(PDF_OUT_DIR, { recursive: true });

// ── Helper: next offer number ─────────────────────────────────────────────────
async function _nextOfferNo(prefix = 'REPV/26-27') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Upsert + increment atomically
    const res = await client.query(
      `INSERT INTO quotation_counter (prefix, last_seq)
         VALUES ($1, 101)
       ON CONFLICT (prefix) DO UPDATE
         SET last_seq   = quotation_counter.last_seq + 1,
             updated_at = NOW()
       RETURNING last_seq`,
      [prefix]
    );
    await client.query('COMMIT');
    return `${prefix}/${res.rows[0].last_seq}`;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── Helper: call Python PDF generator ─────────────────────────────────────────
function _generatePDF(jsonData, outputPath) {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(jsonData);
    execFile(
      'python3',
      [PDF_GEN_SCRIPT, '--output', outputPath],
      { env: { ...process.env, REON_QUOTE_JSON: jsonStr }, timeout: 60_000 },
      (err, stdout, stderr) => {
        if (err) {
          console.error('[PDF] Generation error:', stderr || err.message);
          return reject(new Error(stderr || err.message));
        }
        resolve(outputPath);
      }
    );
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC METHODS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Create a new quotation, auto-assign offer number, generate PDF.
 * @param {object} payload  — validated quotation fields from the API
 * @returns {object}        — saved DB row
 */
async function createQuotation(payload) {
  const prefix  = payload.offer_prefix || 'REPV/26-27';
  const offerNo = await _nextOfferNo(prefix);
  const issueDate = payload.issue_date
    ? new Date(payload.issue_date)
    : new Date();
  const issueDateStr = issueDate.toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).replace(/\//g, '-');     // "05-04-2026"

  // ── Insert into DB ──────────────────────────────────────────────────────
  const q = `
    INSERT INTO quotations (
      offer_no, issue_date,
      customer_name, address, contact_number, email, state,
      project_category, roof_type, project_location,
      electricity_provider, monthly_bill, power_factor,
      capacity, module_technology, inverter_type, brands,
      power_evacuation, project_type,
      base_price, gst_amount, total_price,
      created_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
      $14,$15,$16,$17,$18,$19,$20,$21,$22,$23
    ) RETURNING *`;

  const vals = [
    offerNo,
    issueDate,
    payload.customer_name,
    payload.address        || '',
    payload.contact_number || '',
    payload.email          || '',
    payload.state          || 'West Bengal',
    payload.project_category     || 'Residential',
    payload.roof_type            || '',
    payload.project_location     || payload.address || '',
    payload.electricity_provider || '',
    payload.monthly_bill         || '',
    payload.power_factor         || '',
    payload.capacity             || '3.5 KWp',
    payload.module_technology    || '',
    payload.inverter_type        || 'String Inverter',
    payload.brands               || '',
    payload.power_evacuation     || '230 VAC',
    payload.project_type         || 'Turnkey EPC Project',
    payload.base_price           || '0',
    payload.gst_amount           || '0',
    payload.total_price          || '0',
    payload.created_by           || null,
  ];

  const { rows } = await pool.query(q, vals);
  const row = rows[0];

  // ── Generate PDF asynchronously (don't block response) ──────────────────
  const safeName = row.customer_name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  const fileName = `${offerNo.replace(/\//g, '-')}_${safeName}.pdf`;
  const pdfPath  = path.join(PDF_OUT_DIR, fileName);

  const pdfData = {
    offer_no:             offerNo,
    date:                 issueDateStr,
    customer_name:        row.customer_name,
    address:              row.address,
    contact_number:       row.contact_number,
    email:                row.email,
    state:                row.state,
    project_category:     row.project_category,
    roof_type:            row.roof_type,
    project_location:     row.project_location,
    electricity_provider: row.electricity_provider,
    monthly_bill:         row.monthly_bill,
    power_factor:         row.power_factor,
    capacity:             row.capacity,
    module_technology:    row.module_technology,
    inverter_type:        row.inverter_type,
    brands:               row.brands,
    power_evacuation:     row.power_evacuation,
    project_type:         row.project_type,
    base_price:           row.base_price,
    gst_amount:           row.gst_amount,
    total_price:          row.total_price,
    // custom overrides (e.g. custom BOM) passed through if provided
    ...(payload.custom_bom       && { bom:            payload.custom_bom }),
    ...(payload.custom_warranty  && { warranty:       payload.custom_warranty }),
    ...(payload.custom_payment   && { payment_terms:  payload.custom_payment }),
  };

  _generatePDF(pdfData, pdfPath)
    .then(() => pool.query(
      'UPDATE quotations SET pdf_path=$1, pdf_generated_at=NOW() WHERE id=$2',
      [pdfPath, row.id]
    ))
    .catch(err => console.error(`[PDF] Failed for quotation ${offerNo}:`, err.message));

  return row;
}

/**
 * Regenerate PDF for an existing quotation (e.g. after editing).
 */
async function regeneratePDF(id) {
  const { rows } = await pool.query('SELECT * FROM quotations WHERE id=$1', [id]);
  if (!rows.length) throw new Error('Quotation not found');
  const row = rows[0];

  const safeName = row.customer_name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  const fileName = `${row.offer_no.replace(/\//g, '-')}_${safeName}.pdf`;
  const pdfPath  = path.join(PDF_OUT_DIR, fileName);

  const issueDateStr = new Date(row.issue_date)
    .toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' })
    .replace(/\//g, '-');

  const pdfData = {
    offer_no:             row.offer_no,
    date:                 issueDateStr,
    customer_name:        row.customer_name,
    address:              row.address,
    contact_number:       row.contact_number,
    email:                row.email,
    state:                row.state,
    project_category:     row.project_category,
    roof_type:            row.roof_type,
    project_location:     row.project_location,
    electricity_provider: row.electricity_provider,
    monthly_bill:         row.monthly_bill,
    power_factor:         row.power_factor,
    capacity:             row.capacity,
    module_technology:    row.module_technology,
    inverter_type:        row.inverter_type,
    brands:               row.brands,
    power_evacuation:     row.power_evacuation,
    project_type:         row.project_type,
    base_price:           row.base_price,
    gst_amount:           row.gst_amount,
    total_price:          row.total_price,
  };

  await _generatePDF(pdfData, pdfPath);
  await pool.query(
    'UPDATE quotations SET pdf_path=$1, pdf_generated_at=NOW() WHERE id=$2',
    [pdfPath, id]
  );
  return { ...row, pdf_path: pdfPath };
}

/**
 * List all quotations (paginated, searchable).
 */
async function listQuotations({ page = 1, limit = 20, search = '', status = '' } = {}) {
  const offset  = (page - 1) * limit;
  const filters = [];
  const params  = [];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(customer_name ILIKE $${params.length} OR offer_no ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    filters.push(`status = $${params.length}`);
  }

  const where  = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
  params.push(limit, offset);

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM quotations ${where}`,
    params.slice(0, params.length - 2)
  );
  const { rows } = await pool.query(
    `SELECT * FROM quotations ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    data:  rows,
    total: parseInt(countRes.rows[0].count),
    page,
    limit,
  };
}

/**
 * Get a single quotation by ID.
 */
async function getQuotation(id) {
  const { rows } = await pool.query('SELECT * FROM quotations WHERE id=$1', [id]);
  if (!rows.length) throw new Error('Quotation not found');
  return rows[0];
}

/**
 * Update quotation fields.
 */
async function updateQuotation(id, payload) {
  const allowed = [
    'customer_name','address','contact_number','email','state',
    'project_category','roof_type','project_location',
    'electricity_provider','monthly_bill','power_factor',
    'capacity','module_technology','inverter_type','brands',
    'power_evacuation','project_type',
    'base_price','gst_amount','total_price','status',
  ];
  const sets   = [];
  const vals   = [];
  for (const key of allowed) {
    if (payload[key] !== undefined) {
      vals.push(payload[key]);
      sets.push(`${key} = $${vals.length}`);
    }
  }
  if (!sets.length) throw new Error('Nothing to update');
  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE quotations SET ${sets.join(', ')} WHERE id=$${vals.length} RETURNING *`,
    vals
  );
  if (!rows.length) throw new Error('Quotation not found');
  return rows[0];
}

/**
 * Delete a quotation (and its PDF file).
 */
async function deleteQuotation(id) {
  const { rows } = await pool.query(
    'DELETE FROM quotations WHERE id=$1 RETURNING pdf_path', [id]
  );
  if (!rows.length) throw new Error('Quotation not found');
  if (rows[0].pdf_path && fs.existsSync(rows[0].pdf_path)) {
    fs.unlinkSync(rows[0].pdf_path);
  }
}

module.exports = {
  createQuotation,
  regeneratePDF,
  listQuotations,
  getQuotation,
  updateQuotation,
  deleteQuotation,
};
