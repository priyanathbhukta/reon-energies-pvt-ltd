import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Configure multer for secure enterprise storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'posp');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Enterprise rule: only allow safe document formats
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ─── POST /api/pos/documents/upload ─────────────────────────
router.post('/upload', authenticate, upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document uploaded' });
  }

  const { documentType } = req.body; // 'aadhaar', 'pan', 'bank', 'other'
  
  if (!['aadhaar', 'pan', 'bank', 'other'].includes(documentType)) {
    // Remove the uploaded file if invalid type
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid document type' });
  }

  const client = await pool.connect();
  try {
    const partnerResult = await client.query('SELECT id FROM pos_partners WHERE user_id = $1', [req.user.id]);
    if (partnerResult.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Partner not found' });
    }
    const partnerId = partnerResult.rows[0].id;

    // Secure URL that uses our authenticated GET endpoint
    const secureUrl = `/api/pos/documents/${req.file.filename}`;

    // Upsert logic based on documentType so we don't have duplicates
    const existing = await client.query(
      'SELECT id, document_url FROM partner_documents WHERE partner_id = $1 AND document_type = $2',
      [partnerId, documentType]
    );

    if (existing.rows.length > 0) {
      // Delete old file securely
      const oldUrl = existing.rows[0].document_url;
      const oldFilename = oldUrl.split('/').pop();
      const oldPath = path.join(process.cwd(), 'uploads', 'posp', oldFilename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }

      await client.query(
        `UPDATE partner_documents 
         SET document_url = $1, document_name = $2, file_size = $3, verification_status = 'pending', created_at = NOW()
         WHERE id = $4`,
        [secureUrl, req.file.originalname, req.file.size, existing.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO partner_documents (partner_id, document_type, document_url, document_name, file_size)
         VALUES ($1, $2, $3, $4, $5)`,
        [partnerId, documentType, secureUrl, req.file.originalname, req.file.size]
      );
    }

    res.json({ 
      success: true, 
      message: 'Document uploaded successfully',
      document: {
        type: documentType,
        url: secureUrl,
        name: req.file.originalname
      }
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload document error:', err.message);
    res.status(500).json({ error: 'Failed to upload document' });
  } finally {
    client.release();
  }
});

// ─── GET /api/pos/documents/:filename ───────────────────────
// Securely serve documents only to owner or admin
router.get('/:filename', authenticate, async (req, res) => {
  try {
    const { filename } = req.params;
    const secureUrl = `/api/pos/documents/${filename}`;

    const docResult = await pool.query(
      `SELECT pd.partner_id, pp.user_id 
       FROM partner_documents pd
       JOIN pos_partners pp ON pd.partner_id = pp.id
       WHERE pd.document_url = $1`,
      [secureUrl]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];
    
    // Authorization Check: Is owner OR is admin
    const isOwner = doc.user_id === req.user.id;
    const isAdmin = ['super_admin', 'sales_manager'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied to this secure document' });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'posp', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File missing on server' });
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error('Serve document error:', err.message);
    res.status(500).json({ error: 'Failed to serve document' });
  }
});

export default router;
