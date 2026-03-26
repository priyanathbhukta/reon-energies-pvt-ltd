import { Router } from 'express';
import pool from '../db.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

// ========================
// SCHEMES
// ========================

// GET /api/content/schemes — public
router.get('/schemes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schemes ORDER BY sort_order ASC, id ASC');
    // Parse subsidy_breakdown from JSONB
    const schemes = result.rows.map(s => ({
      ...s,
      subsidy_breakdown: typeof s.subsidy_breakdown === 'string' ? JSON.parse(s.subsidy_breakdown) : s.subsidy_breakdown
    }));
    res.json(schemes);
  } catch (err) {
    console.error('Error fetching schemes:', err.message);
    res.status(500).json({ error: 'Failed to fetch schemes.' });
  }
});

// POST /api/content/schemes — admin
router.post('/schemes', authMiddleware, async (req, res) => {
  try {
    const { icon, badge, name, tagline, eligibility, subsidy_breakdown, reon_help, total_subsidy, accent, featured, sort_order } = req.body;
    const result = await pool.query(
      `INSERT INTO schemes (icon, badge, name, tagline, eligibility, subsidy_breakdown, reon_help, total_subsidy, accent, featured, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [icon || '☀️', badge, name, tagline, eligibility || [], JSON.stringify(subsidy_breakdown || []), reon_help || [], total_subsidy, accent || 'from-emerald-700 to-emerald-600', featured || false, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating scheme:', err.message);
    res.status(500).json({ error: 'Failed to create scheme.' });
  }
});

// PUT /api/content/schemes/:id — admin
router.put('/schemes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { icon, badge, name, tagline, eligibility, subsidy_breakdown, reon_help, total_subsidy, accent, featured, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE schemes SET icon=$1, badge=$2, name=$3, tagline=$4, eligibility=$5, subsidy_breakdown=$6, reon_help=$7, total_subsidy=$8, accent=$9, featured=$10, sort_order=$11 WHERE id=$12 RETURNING *`,
      [icon, badge, name, tagline, eligibility || [], JSON.stringify(subsidy_breakdown || []), reon_help || [], total_subsidy, accent, featured || false, sort_order || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Scheme not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating scheme:', err.message);
    res.status(500).json({ error: 'Failed to update scheme.' });
  }
});

// DELETE /api/content/schemes/:id — admin
router.delete('/schemes/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM schemes WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Scheme not found.' });
    res.json({ message: 'Scheme deleted.' });
  } catch (err) {
    console.error('Error deleting scheme:', err.message);
    res.status(500).json({ error: 'Failed to delete scheme.' });
  }
});

// ========================
// TESTIMONIALS
// ========================

// GET /api/content/testimonials — public
router.get('/testimonials', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching testimonials:', err.message);
    res.status(500).json({ error: 'Failed to fetch testimonials.' });
  }
});

// POST /api/content/testimonials — admin
router.post('/testimonials', authMiddleware, async (req, res) => {
  try {
    const { name, role, rating, review, avatar_initials, avatar_color, date_label, sort_order } = req.body;
    const result = await pool.query(
      `INSERT INTO testimonials (name, role, rating, review, avatar_initials, avatar_color, date_label, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, role, rating || 5, review, avatar_initials || name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2), avatar_color || 'bg-emerald', date_label, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating testimonial:', err.message);
    res.status(500).json({ error: 'Failed to create testimonial.' });
  }
});

// PUT /api/content/testimonials/:id — admin
router.put('/testimonials/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, rating, review, avatar_initials, avatar_color, date_label, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE testimonials SET name=$1, role=$2, rating=$3, review=$4, avatar_initials=$5, avatar_color=$6, date_label=$7, sort_order=$8 WHERE id=$9 RETURNING *`,
      [name, role, rating, review, avatar_initials, avatar_color, date_label, sort_order || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Testimonial not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating testimonial:', err.message);
    res.status(500).json({ error: 'Failed to update testimonial.' });
  }
});

// DELETE /api/content/testimonials/:id — admin
router.delete('/testimonials/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM testimonials WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Testimonial not found.' });
    res.json({ message: 'Testimonial deleted.' });
  } catch (err) {
    console.error('Error deleting testimonial:', err.message);
    res.status(500).json({ error: 'Failed to delete testimonial.' });
  }
});

// ========================
// GALLERY IMAGES
// ========================

// GET /api/content/gallery — public
router.get('/gallery', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gallery_images ORDER BY sort_order ASC, id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching gallery:', err.message);
    res.status(500).json({ error: 'Failed to fetch gallery.' });
  }
});

// POST /api/content/gallery — admin
router.post('/gallery', authMiddleware, async (req, res) => {
  try {
    const { image_url, alt_text, label, sort_order } = req.body;
    const result = await pool.query(
      'INSERT INTO gallery_images (image_url, alt_text, label, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [image_url, alt_text, label, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating gallery image:', err.message);
    res.status(500).json({ error: 'Failed to create gallery image.' });
  }
});

// PUT /api/content/gallery/:id — admin
router.put('/gallery/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url, alt_text, label, sort_order } = req.body;
    const result = await pool.query(
      'UPDATE gallery_images SET image_url=$1, alt_text=$2, label=$3, sort_order=$4 WHERE id=$5 RETURNING *',
      [image_url, alt_text, label, sort_order || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Gallery image not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating gallery image:', err.message);
    res.status(500).json({ error: 'Failed to update gallery image.' });
  }
});

// DELETE /api/content/gallery/:id — admin
router.delete('/gallery/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM gallery_images WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Gallery image not found.' });
    res.json({ message: 'Gallery image deleted.' });
  } catch (err) {
    console.error('Error deleting gallery image:', err.message);
    res.status(500).json({ error: 'Failed to delete gallery image.' });
  }
});

export default router;
