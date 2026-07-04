const { get, run, all } = require('../../database/db');

// POST /api/bookmarks/:propertyId - toggle
function toggleBookmark(req, res) {
  try {
    const propertyId = parseInt(req.params.propertyId);
    const userId = req.user.id;

    const property = get(`SELECT id FROM properties WHERE id = ${propertyId}`);
    if (!property) return res.status(404).json({ success: false, message: 'آگهی یافت نشد' });

    const existing = get(`SELECT id FROM bookmarks WHERE user_id = ${userId} AND property_id = ${propertyId}`);

    if (existing) {
      run(`DELETE FROM bookmarks WHERE user_id = ${userId} AND property_id = ${propertyId}`);
      return res.json({ success: true, bookmarked: false, message: 'از علاقه‌مندی‌ها حذف شد' });
    } else {
      run(`INSERT INTO bookmarks (user_id, property_id, created_at) VALUES (?, ?, datetime('now'))`, [userId, propertyId]);
      return res.json({ success: true, bookmarked: true, message: 'به علاقه‌مندی‌ها اضافه شد' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/bookmarks
function getBookmarks(req, res) {
  try {
    const bookmarks = all(`
      SELECT p.*, l.name as location_name,
             (SELECT filepath FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
             b.created_at as bookmarked_at
      FROM bookmarks b
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN locations l ON p.location_id = l.id
      WHERE b.user_id = ${req.user.id}
      ORDER BY b.created_at DESC
    `);
    return res.json({ success: true, bookmarks });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/bookmarks/check/:propertyId
function checkBookmark(req, res) {
  try {
    const existing = get(`SELECT id FROM bookmarks WHERE user_id = ${req.user.id} AND property_id = ${parseInt(req.params.propertyId)}`);
    return res.json({ success: true, bookmarked: !!existing });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

module.exports = { toggleBookmark, getBookmarks, checkBookmark };
