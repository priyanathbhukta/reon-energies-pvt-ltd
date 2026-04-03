/**
 * routes.js
 * Quotation Generator — all API routes, protected by auth middleware.
 */

import express from 'express';
import multer from 'multer';
import authMiddleware from '../../middleware/auth.js';
import * as controller from './quotation.controller.js';

const router = express.Router();

// Memory storage — files go to Cloudinary, never touch disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are allowed'));
  },
});

// All routes require admin auth
router.use(authMiddleware);

// ── Quotation endpoints ────────────────────────────────────────────────────────
router.post('/quotation/generate',   controller.generateQuotation);
router.get('/quotation/list',        controller.getQuotations);
router.get('/quotation/:id',         controller.getQuotation);
router.get('/quotation/:id/pdf',     controller.downloadPDF);
router.get('/quotation/:id/docx',    controller.downloadDOCX);
router.delete('/quotation/:id',      controller.removeQuotation);

// ── Template endpoints ────────────────────────────────────────────────────────
router.post('/template/upload',      upload.single('template'), controller.uploadTemplate);
router.get('/template/list',         controller.listTemplates);
router.patch('/template/:id/default', controller.setDefaultTemplate);
router.delete('/template/:id',       controller.removeTemplate);

export default router;
