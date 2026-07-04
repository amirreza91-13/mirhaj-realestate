const { get, all } = require('../../database/db');

// GET /api/similar/:id
function getSimilar(req, res) {
  try {
    const id = parseInt(req.params.id);
    const p = get(`SELECT * FROM properties WHERE id = ${id}`);
    if (!p) return res.status(404).json({ success: false, message: 'آگهی یافت نشد' });

    const minPrice = p.total_price * 0.6;
    const maxPrice = p.total_price * 1.4;
    const minArea  = p.area * 0.6;
    const maxArea  = p.area * 1.4;

    let similar = all(`
      SELECT p.*, l.name as location_name,
             (SELECT filepath FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM properties p LEFT JOIN locations l ON p.location_id = l.id
      WHERE p.id != ${id} AND p.active = 1
        AND p.property_type = '${p.property_type}'
        AND p.total_price BETWEEN ${minPrice} AND ${maxPrice}
        AND p.area BETWEEN ${minArea} AND ${maxArea}
      ORDER BY ABS(p.total_price - ${p.total_price}) ASC
      LIMIT 4
    `);

    // اگه کمتر از ۴ تا بود با همون نوع پر کن
    if (similar.length < 4) {
      const existingIds = [id, ...similar.map(s => s.id)].join(',');
      const more = all(`
        SELECT p.*, l.name as location_name,
               (SELECT filepath FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
        FROM properties p LEFT JOIN locations l ON p.location_id = l.id
        WHERE p.id NOT IN (${existingIds}) AND p.active = 1
          AND p.property_type = '${p.property_type}'
        ORDER BY p.created_at DESC
        LIMIT ${4 - similar.length}
      `);
      similar = [...similar, ...more];
    }

    return res.json({ success: true, properties: similar });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

module.exports = { getSimilar };
