// backend/services/quotationService.js
// Local Mock implementation without PostgreSQL
'use strict';

const path   = require('path');
const fs     = require('fs');
const { execFile } = require('child_process');

let counter = 100;
let quotationsDb = [];

// ── Paths ─────────────────────────────────────────────────────────────────────
const PDF_GEN_SCRIPT = path.join(__dirname, 'run_pdf_gen.py');
const PDF_OUT_DIR    = process.env.PDF_OUTPUT_DIR
                       || path.join(__dirname, '../../generated_pdfs');

// Ensure output directory exists
fs.mkdirSync(PDF_OUT_DIR, { recursive: true });

async function _nextOfferNo(prefix = 'REPV/26-27') {
  counter++;
  return `${prefix}/${counter}`;
}

function _generatePDF(jsonData, outputPath) {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(jsonData);
    execFile(
      'python', // Assuming windows
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

function _buildPdfData(row, issueDateStr) {
  return {
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
    panel_watt:           row.panel_watt,
    panel_spec:           row.panel_spec,
    module_technology:    row.module_technology,
    inverter_type:        row.inverter_type,
    brands:               row.brands,
    power_evacuation:     row.power_evacuation,
    project_type:         row.project_type,
    base_price:           row.base_price,
    gst_amount:           row.gst_amount,
    total_price:          row.total_price,
    payment_mode:         row.payment_mode,
    down_payment:         row.down_payment,
    loan_amount:          row.loan_amount,
    interest_rate:        row.interest_rate,
    tenure:               row.tenure,
    emi_amount:           row.emi_amount,
    total_interest:       row.total_interest,
    total_emi_paid:       row.total_emi_paid,
  };
}

async function createQuotation(payload) {
  const prefix  = payload.offer_prefix || 'REPL/26-27';
  // Use manual offer_no if provided, otherwise auto-increment
  const offerNo = payload.offer_no_manual
    ? payload.offer_no_manual.trim()
    : await _nextOfferNo(prefix);
  const issueDate = payload.issue_date ? new Date(payload.issue_date) : new Date();
  const issueDateStr = issueDate.toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).replace(/\//g, '-');

  const row = {
    id: Date.now(),
    offer_no: offerNo,
    issue_date: issueDate,
    customer_name: payload.customer_name,
    address: payload.address || '',
    contact_number: payload.contact_number || '',
    email: payload.email || '',
    state: payload.state || 'West Bengal',
    project_category: payload.project_category || 'Residential',
    roof_type: payload.roof_type || '',
    project_location: payload.project_location || payload.address || '',
    electricity_provider: payload.electricity_provider || '',
    monthly_bill: payload.monthly_bill || '',
    power_factor: payload.power_factor || '',
    capacity: payload.capacity || '45 KWp',
    panel_watt: payload.panel_watt || 550,
    panel_spec: payload.panel_spec || '550Wp Mono-Crystalline Bifacial N-Type Topcon',
    module_technology: payload.module_technology || '',
    inverter_type: payload.inverter_type || 'String Inverter',
    brands: payload.brands || '',
    power_evacuation: payload.power_evacuation || '230 VAC',
    project_type: payload.project_type || 'Turnkey EPC Project',
    base_price: payload.base_price || '0',
    gst_amount: payload.gst_amount || '0',
    total_price: payload.total_price || '0',
    payment_mode: payload.payment_mode || 'Cash',
    down_payment: payload.down_payment || '',
    loan_amount: payload.loan_amount || '',
    interest_rate: payload.interest_rate || '',
    tenure: payload.tenure || '',
    emi_amount: payload.emi || '',
    total_interest: payload.total_interest || '',
    total_emi_paid: payload.total_emi_paid || '',
    created_at: new Date()
  };

  quotationsDb.push(row);

  const safeName = row.customer_name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  const fileName = `${offerNo.replace(/\//g, '-')}_${safeName}.pdf`;
  const pdfPath  = path.join(PDF_OUT_DIR, fileName);

  const pdfData = _buildPdfData(row, issueDateStr);
  if (payload.custom_bom) pdfData.bom = payload.custom_bom;
  if (payload.custom_warranty) pdfData.warranty = payload.custom_warranty;
  if (payload.custom_payment) pdfData.payment_terms = payload.custom_payment;

  _generatePDF(pdfData, pdfPath)
    .then(() => {
      row.pdf_path = pdfPath;
      row.pdf_generated_at = new Date();
    })
    .catch(err => console.error(`[PDF] Failed for quotation ${offerNo}:`, err.message));

  return row;
}

async function regeneratePDF(id) {
  const row = quotationsDb.find(q => q.id === id);
  if (!row) throw new Error('Quotation not found');

  const safeName = row.customer_name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  const fileName = `${row.offer_no.replace(/\//g, '-')}_${safeName}.pdf`;
  const pdfPath  = path.join(PDF_OUT_DIR, fileName);
  
  const issueDateStr = new Date(row.issue_date).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).replace(/\//g, '-');

  const pdfData = _buildPdfData(row, issueDateStr);

  await _generatePDF(pdfData, pdfPath);
  row.pdf_path = pdfPath;
  row.pdf_generated_at = new Date();
  
  return row;
}

async function listQuotations({ page = 1, limit = 20, search = '', status = '' } = {}) {
  let filtered = [...quotationsDb];
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(q => q.customer_name.toLowerCase().includes(s) || q.offer_no.toLowerCase().includes(s));
  }
  if (status) {
    filtered = filtered.filter(q => q.status === status);
  }
  
  filtered.sort((a, b) => b.created_at - a.created_at);
  const total = filtered.length;
  const data = filtered.slice((page - 1) * limit, page * limit);

  return { data, total, page, limit };
}

async function getQuotation(id) {
  const row = quotationsDb.find(q => q.id === id);
  if (!row) throw new Error('Quotation not found');
  return row;
}

async function updateQuotation(id, payload) {
  const row = quotationsDb.find(q => q.id === id);
  if (!row) throw new Error('Quotation not found');
  
  const allowed = [
    'customer_name','address','contact_number','email','state',
    'project_category','roof_type','project_location',
    'electricity_provider','monthly_bill','power_factor',
    'capacity','module_technology','inverter_type','brands',
    'power_evacuation','project_type',
    'base_price','gst_amount','total_price','status',
    'payment_mode','down_payment','loan_amount','interest_rate','tenure',
    'emi_amount','total_interest','total_emi_paid'
  ];
  
  for (const key of allowed) {
    if (payload[key] !== undefined) {
      row[key] = payload[key];
    }
  }
  return row;
}

async function deleteQuotation(id) {
  const idx = quotationsDb.findIndex(q => q.id === id);
  if (idx === -1) throw new Error('Quotation not found');
  
  const row = quotationsDb[idx];
  quotationsDb.splice(idx, 1);
  
  if (row.pdf_path && fs.existsSync(row.pdf_path)) {
    fs.unlinkSync(row.pdf_path);
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
