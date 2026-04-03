/**
 * template.service.js
 * Handles DOCX/PDF template upload to Cloudinary and DB CRUD.
 */

import { v2 as cloudinary } from 'cloudinary';
import pool from '../../db.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file buffer to Cloudinary as a raw resource.
 */
export async function uploadToCloudinary(fileBuffer, originalName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'reon-templates',
        public_id: `tpl_${Date.now()}_${originalName.replace(/[^a-zA-Z0-9]/g, '_')}`,
        use_filename: false,
        overwrite: false,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
}

/**
 * Save template record to DB.
 */
export async function saveTemplate(name, cloudinaryResult, fileType) {
  const { rows } = await pool.query(
    `INSERT INTO templates (name, file_path, cloudinary_public_id, file_type, is_default)
     VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
    [name, cloudinaryResult.secure_url, cloudinaryResult.public_id, fileType]
  );
  return rows[0];
}

/**
 * List all templates ordered by newest first.
 */
export async function listTemplates() {
  const { rows } = await pool.query(
    'SELECT * FROM templates ORDER BY is_default DESC, created_at DESC'
  );
  return rows;
}

/**
 * Set a template as the default (unsets all others first).
 */
export async function setDefaultTemplate(id) {
  await pool.query('UPDATE templates SET is_default = FALSE');
  const { rows } = await pool.query(
    'UPDATE templates SET is_default = TRUE WHERE id = $1 RETURNING *',
    [id]
  );
  if (rows.length === 0) throw new Error('Template not found');
  return rows[0];
}

/**
 * Delete a template from Cloudinary and DB.
 */
export async function deleteTemplate(id) {
  const { rows } = await pool.query('SELECT * FROM templates WHERE id = $1', [id]);
  if (rows.length === 0) throw new Error('Template not found');

  const { cloudinary_public_id } = rows[0];
  try {
    await cloudinary.uploader.destroy(cloudinary_public_id, { resource_type: 'raw' });
  } catch (err) {
    console.warn('Cloudinary delete warning:', err.message);
  }

  await pool.query('DELETE FROM templates WHERE id = $1', [id]);
  return { success: true };
}

/**
 * Fetch a template file from Cloudinary and return as Buffer.
 */
export async function fetchTemplateBuffer(fileUrl) {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error('Could not fetch template from Cloudinary');
  return Buffer.from(await response.arrayBuffer());
}
