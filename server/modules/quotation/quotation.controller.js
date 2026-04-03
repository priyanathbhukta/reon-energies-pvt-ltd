/**
 * quotation.controller.js
 * HTTP request/response handlers — delegates to services.
 */

import * as quotationSvc from './quotation.service.js';
import * as templateSvc from './template.service.js';

// ─── QUOTATIONS ───────────────────────────────────────────────────────────────

export async function generateQuotation(req, res) {
  try {
    const quotation = await quotationSvc.createQuotation(req.body);
    res.status(201).json({ success: true, quotation });
  } catch (err) {
    console.error('[Quotation] generate error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

export async function getQuotations(req, res) {
  try {
    const { search, from_date, to_date, limit, offset } = req.query;
    const quotations = await quotationSvc.listQuotations({ search, from_date, to_date, limit, offset });
    res.json(quotations);
  } catch (err) {
    console.error('[Quotation] list error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function getQuotation(req, res) {
  try {
    const quotation = await quotationSvc.getQuotation(req.params.id);
    res.json(quotation);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

export async function removeQuotation(req, res) {
  try {
    await quotationSvc.deleteQuotation(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function downloadPDF(req, res) {
  try {
    const quotation = await quotationSvc.getQuotation(req.params.id);
    const buffer = await quotationSvc.generatePDFBuffer(quotation);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="REON_Quotation_${quotation.id}.pdf"`
    );
    res.send(buffer);
  } catch (err) {
    console.error('[Quotation] PDF error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function downloadDOCX(req, res) {
  try {
    const quotation = await quotationSvc.getQuotation(req.params.id);

    // Look for default DOCX template
    const templates = await templateSvc.listTemplates();
    const defaultTpl = templates.find((t) => t.is_default && t.file_type === 'docx');

    let templateBuffer = null;
    if (defaultTpl) {
      templateBuffer = await templateSvc.fetchTemplateBuffer(defaultTpl.file_path);
    }

    const buffer = quotationSvc.generateDOCXBuffer(quotation, templateBuffer);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="REON_Quotation_${quotation.id}.docx"`
    );
    res.send(buffer);
  } catch (err) {
    console.error('[Quotation] DOCX error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

export async function uploadTemplate(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { name } = req.body;
    const mime = req.file.mimetype;
    const fileType = mime.includes('pdf') ? 'pdf' : 'docx';

    const cloudResult = await templateSvc.uploadToCloudinary(
      req.file.buffer,
      req.file.originalname
    );
    const template = await templateSvc.saveTemplate(
      name || req.file.originalname,
      cloudResult,
      fileType
    );
    res.status(201).json({ success: true, template });
  } catch (err) {
    console.error('[Template] upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function listTemplates(req, res) {
  try {
    const templates = await templateSvc.listTemplates();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function setDefaultTemplate(req, res) {
  try {
    const template = await templateSvc.setDefaultTemplate(req.params.id);
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function removeTemplate(req, res) {
  try {
    await templateSvc.deleteTemplate(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
