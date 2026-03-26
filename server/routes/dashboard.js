import { Router } from 'express';
import pool from '../db.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard/stats — admin only
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Total leads
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM enquiries');
    const totalLeads = parseInt(totalResult.rows[0].count);

    // By status
    const statusResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM enquiries GROUP BY status`
    );
    const statusMap = {};
    statusResult.rows.forEach(row => {
      statusMap[row.status] = parseInt(row.count);
    });

    // Monthly stats (current month vs previous month)
    const currentMonthResult = await pool.query(
      `SELECT COUNT(*) as count FROM enquiries 
       WHERE created_at >= date_trunc('month', CURRENT_DATE)`
    );
    const currentMonth = parseInt(currentMonthResult.rows[0].count);

    const prevMonthResult = await pool.query(
      `SELECT COUNT(*) as count FROM enquiries 
       WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
       AND created_at < date_trunc('month', CURRENT_DATE)`
    );
    const prevMonth = parseInt(prevMonthResult.rows[0].count);

    // Growth percentage
    const growth = prevMonth > 0
      ? (((currentMonth - prevMonth) / prevMonth) * 100).toFixed(1)
      : currentMonth > 0 ? 100 : 0;

    // Revenue estimate (based on converted customers' monthly bills)
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(monthly_bill), 0) as total FROM enquiries WHERE status = 'converted'`
    );
    const estimatedRevenue = parseFloat(revenueResult.rows[0].total);

    // Installation type breakdown
    const typeResult = await pool.query(
      `SELECT installation_type, COUNT(*) as count FROM enquiries GROUP BY installation_type`
    );
    const typeMap = {};
    typeResult.rows.forEach(row => {
      typeMap[row.installation_type] = parseInt(row.count);
    });

    // Payment method breakdown
    const paymentResult = await pool.query(
      `SELECT payment_method, COUNT(*) as count FROM enquiries GROUP BY payment_method`
    );
    const paymentMap = {};
    paymentResult.rows.forEach(row => {
      paymentMap[row.payment_method] = parseInt(row.count);
    });

    // Recent enquiries (last 5)
    const recentResult = await pool.query(
      'SELECT id, name, phone, status, created_at FROM enquiries ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      totalLeads,
      newLeads: statusMap['new'] || 0,
      contacted: statusMap['contacted'] || 0,
      converted: statusMap['converted'] || 0,
      lost: statusMap['lost'] || 0,
      potentialCustomers: (statusMap['new'] || 0) + (statusMap['contacted'] || 0),
      currentMonthLeads: currentMonth,
      previousMonthLeads: prevMonth,
      growthPercentage: parseFloat(growth),
      estimatedRevenue,
      installationTypes: typeMap,
      paymentMethods: paymentMap,
      recentEnquiries: recentResult.rows,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

export default router;
