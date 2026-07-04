const express = require('express');
const router = express.Router();
const { all, get } = require('../../database/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware, requireRole('manager'));

// GET /api/analytics/overview
router.get('/overview', (req, res) => {
  try {
    const totalProps    = all(`SELECT COUNT(*) as c FROM properties`)[0]?.c || 0;
    const activeProps   = all(`SELECT COUNT(*) as c FROM properties WHERE active=1`)[0]?.c || 0;
    const totalUsers    = all(`SELECT COUNT(*) as c FROM users`)[0]?.c || 0;
    const totalMessages = all(`SELECT COUNT(*) as c FROM messages`)[0]?.c || 0;
    const totalBookmarks= all(`SELECT COUNT(*) as c FROM bookmarks`)[0]?.c || 0;
    const totalViews    = all(`SELECT SUM(view_count) as c FROM properties`)[0]?.c || 0;

    // قیمت میانگین
    const priceStats = all(`SELECT AVG(total_price) as avg, MIN(total_price) as min, MAX(total_price) as max FROM properties WHERE active=1`)[0];

    // آگهی‌های ۷ روز اخیر
    const recentProps = all(`SELECT COUNT(*) as c FROM properties WHERE created_at >= datetime('now','-7 days')`)[0]?.c || 0;

    // کاربران جدید ۷ روز اخیر
    const recentUsers = all(`SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now','-7 days')`)[0]?.c || 0;

    res.json({ success: true, stats: {
      totalProps, activeProps, totalUsers, totalMessages,
      totalBookmarks, totalViews: totalViews || 0,
      recentProps, recentUsers,
      avgPrice: Math.round(priceStats?.avg || 0),
      minPrice: priceStats?.min || 0,
      maxPrice: priceStats?.max || 0
    }});
  } catch(err) { res.status(500).json({ success: false, message: 'خطای سرور' }); }
});

// GET /api/analytics/props-by-type
router.get('/props-by-type', (req, res) => {
  try {
    const data = all(`SELECT property_type, COUNT(*) as count FROM properties GROUP BY property_type ORDER BY count DESC`);
    res.json({ success: true, data });
  } catch(err) { res.status(500).json({ success: false }); }
});

// GET /api/analytics/props-by-location
router.get('/props-by-location', (req, res) => {
  try {
    const data = all(`
      SELECT l.name, COUNT(p.id) as count
      FROM locations l LEFT JOIN properties p ON l.id = p.location_id
      GROUP BY l.id ORDER BY count DESC LIMIT 10
    `);
    res.json({ success: true, data });
  } catch(err) { res.status(500).json({ success: false }); }
});

// GET /api/analytics/registrations-trend
router.get('/registrations-trend', (req, res) => {
  try {
    const data = all(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM users WHERE created_at >= datetime('now','-30 days')
      GROUP BY date(created_at) ORDER BY date ASC
    `);
    res.json({ success: true, data });
  } catch(err) { res.status(500).json({ success: false }); }
});

// GET /api/analytics/top-properties
router.get('/top-properties', (req, res) => {
  try {
    const data = all(`
      SELECT p.id, p.title, p.view_count, p.total_price, l.name as location_name,
             (SELECT filepath FROM property_images WHERE property_id=p.id AND is_primary=1 LIMIT 1) as img
      FROM properties p LEFT JOIN locations l ON p.location_id=l.id
      WHERE p.active=1 ORDER BY p.view_count DESC LIMIT 5
    `);
    res.json({ success: true, data });
  } catch(err) { res.status(500).json({ success: false }); }
});

module.exports = router;
