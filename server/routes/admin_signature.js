import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'signatures');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  
  if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    return `${proto}://${host}`;
  }
  
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  return `${proto}://${host}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const fname = `signature_${Date.now()}${ext}`;
    cb(null, fname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPG/JPEG image formats are supported for signature upload.'));
    }
  },
});

// ── GET /api/admin/signature ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM authorized_signatures WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    if (result.rows.length === 0) {
      return res.json({ success: true, signature: null });
    }
    res.json({ success: true, signature: result.rows[0] });
  } catch (err) {
    console.error('Fetch signature error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/signature/upload ──────────────────────────────────────
router.post('/upload', upload.single('signature'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No signature file uploaded.' });
  }

  const uploadedFile = req.file;
  const signatureUrl = `${getBaseUrl(req)}/uploads/signatures/${uploadedFile.filename}`;
  const signerName = req.body.signerName || 'Authorised Signatory';
  const signerTitle = req.body.signerTitle || 'Authorised Signatory';
  const uploadedBy = req.user?.username || req.user?.full_name || 'Admin';

  // Also maintain active_signature.png for direct fallback in python generator
  try {
    const activeSigPath = path.join(UPLOAD_DIR, 'active_signature.png');
    fs.copyFileSync(uploadedFile.path, activeSigPath);
  } catch (cpErr) {
    console.warn('Could not copy to active_signature.png:', cpErr);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Deactivate previous signatures
    await client.query('UPDATE authorized_signatures SET is_active = false');

    // Insert new active signature
    const insertQuery = `
      INSERT INTO authorized_signatures (
        signature_image_url, signature_file_path, signer_name, signer_title,
        is_active, uploaded_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
      RETURNING *;
    `;
    const result = await client.query(insertQuery, [
      signatureUrl,
      uploadedFile.path,
      signerName,
      signerTitle,
      uploadedBy,
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Authorized signature uploaded and activated successfully.',
      signature: result.rows[0],
      url: signatureUrl,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Upload signature error:', err);
    res.status(500).json({ error: 'Failed to record signature', details: err.message });
  } finally {
    client.release();
  }
});

// ── DELETE /api/admin/signature ───────────────────────────────────────────
router.delete('/', async (req, res) => {
  try {
    await pool.query('UPDATE authorized_signatures SET is_active = false');
    const activeSigPath = path.join(UPLOAD_DIR, 'active_signature.png');
    if (fs.existsSync(activeSigPath)) {
      try { fs.unlinkSync(activeSigPath); } catch (_) {}
    }
    res.json({ success: true, message: 'Authorized signature removed.' });
  } catch (err) {
    console.error('Remove signature error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
