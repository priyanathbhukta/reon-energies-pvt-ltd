/**
 * quotation.service.js
 * DB CRUD for quotations + PDF generation via PDFKit.
 * DOCX generation via docxtemplater + pizzip.
 */

import PDFDocument from 'pdfkit';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import pool from '../../db.js';
import { calculateSolar } from './calculation.service.js';

// ─── CREATE ──────────────────────────────────────────────────────────────────

export async function createQuotation(data) {
  const calcs = calculateSolar(data);

  const { rows } = await pool.query(
    `INSERT INTO quotations (
      customer_name, address, electricity_provider, monthly_bill,
      load_kw, power_factor, installation_area, panel_size, panel_power,
      payment_mode, installation_type, cost_per_kw,
      system_size, panels, area_required, monthly_generation,
      monthly_savings, emi_details, total_cost
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
      $13,$14,$15,$16,$17,$18,$19
    ) RETURNING *`,
    [
      data.customer_name,
      data.address,
      data.electricity_provider,
      data.monthly_bill,
      data.load_kw || null,
      data.power_factor || null,
      data.installation_area,
      data.panel_size,
      data.panel_power,
      data.payment_mode,
      data.installation_type || 'domestic',
      data.cost_per_kw || null,
      calcs.system_size,
      calcs.panels,
      calcs.area_required,
      calcs.monthly_generation,
      calcs.monthly_savings,
      calcs.emi_details ? JSON.stringify(calcs.emi_details) : null,
      calcs.total_cost,
    ]
  );

  return { ...rows[0], calculations: calcs };
}

// ─── READ ─────────────────────────────────────────────────────────────────────

export async function listQuotations({ search, from_date, to_date, limit = 50, offset = 0 } = {}) {
  const params = [];
  let query = 'SELECT * FROM quotations WHERE 1=1';

  if (search) {
    params.push(`%${search}%`);
    query += ` AND customer_name ILIKE $${params.length}`;
  }
  if (from_date) {
    params.push(from_date);
    query += ` AND created_at >= $${params.length}`;
  }
  if (to_date) {
    params.push(to_date);
    query += ` AND created_at < ($${params.length}::date + INTERVAL '1 day')`;
  }

  query += ` ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function getQuotation(id) {
  const { rows } = await pool.query('SELECT * FROM quotations WHERE id = $1', [id]);
  if (rows.length === 0) throw new Error('Quotation not found');
  return rows[0];
}

export async function deleteQuotation(id) {
  await pool.query('DELETE FROM quotations WHERE id = $1', [id]);
  return { success: true };
}

// ─── PDF GENERATION ───────────────────────────────────────────────────────────

const GREEN = '#1DBF73';
const NAVY  = '#0A2540';
const GRAY  = '#6B7280';
const LIGHT = '#F9FAFB';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

export function generatePDFBuffer(quotation) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100; // usable width

    // ── Header bar ──
    doc.rect(0, 0, doc.page.width, 80).fill(NAVY);
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#FFFFFF')
      .text('REON ENERGIES PVT. LTD.', 50, 20, { align: 'center', width: W });
    doc.fontSize(10).font('Helvetica').fillColor(GREEN)
      .text('Solar Energy Solutions | www.reonenergy.in', 50, 48, { align: 'center', width: W });

    // ── Quotation tag ──
    doc.rect(0, 80, doc.page.width, 40).fill(GREEN);
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#FFFFFF')
      .text(`SOLAR QUOTATION  #${quotation.id}`, 50, 91, { align: 'center', width: W });

    doc.moveDown(4);

    // ── Meta row ──
    const metaY = 140;
    doc.fontSize(9).font('Helvetica').fillColor(GRAY);
    doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 50, metaY);
    doc.text(`Valid for: 30 days`, 50, metaY + 14);
    doc.text(`Type: ${quotation.installation_type || 'Domestic'}`, 350, metaY);
    doc.text(`Payment: ${quotation.payment_mode || 'Cash'}`, 350, metaY + 14);

    doc.moveTo(50, 175).lineTo(doc.page.width - 50, 175).strokeColor('#E5E7EB').stroke();

    // ── Section helper ──
    const sectionHeader = (title, y) => {
      doc.rect(50, y, W, 26).fill(LIGHT);
      doc.fontSize(11).font('Helvetica-Bold').fillColor(NAVY)
        .text(title, 58, y + 7);
      return y + 34;
    };

    const row = (label, value, y, alt = false) => {
      if (alt) doc.rect(50, y, W, 22).fill('#FAFAFA');
      doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY).text(label, 58, y + 6, { width: 180 });
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text(String(value || 'N/A'), 238, y + 6, { width: 300 });
      return y + 22;
    };

    // ── Customer Details ──
    let y = sectionHeader('CUSTOMER DETAILS', 185);
    y = row('Customer Name', quotation.customer_name, y, false);
    y = row('Address', quotation.address, y, true);
    y = row('Electricity Provider', quotation.electricity_provider, y, false);
    y = row('Monthly Bill', `₹ ${fmt(quotation.monthly_bill)}`, y, true);
    y = row('Payment Mode', quotation.payment_mode, y, false);
    y += 12;

    // ── System Specifications ──
    y = sectionHeader('SYSTEM SPECIFICATIONS', y);
    y = row('System Size', `${quotation.system_size} kW`, y, false);
    y = row('Number of Panels', `${quotation.panels} panels`, y, true);
    y = row('Area Required', `${quotation.area_required} sqft`, y, false);
    y = row('Monthly Generation', `${quotation.monthly_generation} units`, y, true);
    y = row('Monthly Savings', `₹ ${fmt(quotation.monthly_savings)}`, y, false);
    y = row('Annual Savings', `₹ ${fmt(Number(quotation.monthly_savings) * 12)}`, y, true);
    if (quotation.total_cost) {
      y = row('Total System Cost', `₹ ${fmt(quotation.total_cost)}`, y, false);
    }
    y += 12;

    // ── EMI Details ──
    const emi = quotation.emi_details
      ? (typeof quotation.emi_details === 'string' ? JSON.parse(quotation.emi_details) : quotation.emi_details)
      : null;

    if (emi) {
      y = sectionHeader('EMI DETAILS', y);
      y = row('Monthly EMI', `₹ ${fmt(emi.monthly_emi)}`, y, false);
      y = row('Loan Tenure', `${emi.months} months`, y, true);
      y = row('Interest Rate', `${emi.interest_rate}% per annum`, y, false);
      y = row('Total Payable', `₹ ${fmt(emi.total_payable)}`, y, true);
      y = row('Total Interest', `₹ ${fmt(emi.total_interest)}`, y, false);
      y += 12;
    }

    // ── Savings highlight box ──
    if (y < 660) {
      doc.rect(50, y, W, 60).fill('#ECFDF5').stroke('#A7F3D0');
      doc.fontSize(12).font('Helvetica-Bold').fillColor(GREEN)
        .text('💡 Estimated Payback Period', 58, y + 10);
      const payback = quotation.total_cost
        ? (Number(quotation.total_cost) / Number(quotation.monthly_savings) / 12).toFixed(1)
        : '—';
      doc.fontSize(10).font('Helvetica').fillColor(NAVY)
        .text(`Your solar system will pay for itself in approximately ${payback} years.`, 58, y + 28);
    }

    // ── Footer ──
    doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill(NAVY);
    doc.fontSize(8).font('Helvetica').fillColor('#9CA3AF')
      .text(
        'REON Energies Pvt. Ltd.  |  Solar Energy Solutions  |  This quotation is computer generated.',
        50, doc.page.height - 32, { align: 'center', width: W }
      );

    doc.end();
  });
}

// ─── DOCX GENERATION ─────────────────────────────────────────────────────────

export function generateDOCXBuffer(quotation, templateBuffer) {
  if (!templateBuffer) {
    throw new Error(
      'No default DOCX template found. Please upload and set a default DOCX template in Template Manager.'
    );
  }

  const emi = quotation.emi_details
    ? (typeof quotation.emi_details === 'string' ? JSON.parse(quotation.emi_details) : quotation.emi_details)
    : {};

  const zip = new PizZip(templateBuffer);
  const docx = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  docx.render({
    quotation_id: String(quotation.id),
    date: new Date(quotation.created_at).toLocaleDateString('en-IN'),
    customer_name: quotation.customer_name || '',
    address: quotation.address || '',
    electricity_provider: quotation.electricity_provider || '',
    monthly_bill: fmt(quotation.monthly_bill),
    installation_type: quotation.installation_type || 'Domestic',
    payment_mode: quotation.payment_mode || 'Cash',
    system_size: String(quotation.system_size),
    panels: String(quotation.panels),
    area_required: String(quotation.area_required),
    monthly_generation: String(quotation.monthly_generation),
    monthly_savings: fmt(quotation.monthly_savings),
    annual_savings: fmt(Number(quotation.monthly_savings) * 12),
    total_cost: quotation.total_cost ? fmt(quotation.total_cost) : 'N/A',
    monthly_emi: emi?.monthly_emi ? fmt(emi.monthly_emi) : 'N/A',
    emi_months: emi?.months ? String(emi.months) : 'N/A',
    emi_interest: emi?.interest_rate ? `${emi.interest_rate}%` : 'N/A',
    total_payable: emi?.total_payable ? fmt(emi.total_payable) : 'N/A',
  });

  return docx.getZip().generate({ type: 'nodebuffer' });
}
