const fs = require('fs');
const path = require('path');
const { get, run, all } = require('../../database/db');
const { logActivity } = require('../utils/logger');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// GET /api/properties
function getProperties(req, res) {
  try {
    const {
      property_type, min_price, max_price,
      min_area, max_area, rooms,
      search, location_id, sort, page = 1, limit = 12
    } = req.query;

    let conditions = ['p.active = 1'];

    if (property_type && property_type.trim()) {
      const types = property_type.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length) {
        const escaped = types.map(t => `'${t.replace(/'/g,"''")}'`).join(',');
        conditions.push(`p.property_type IN (${escaped})`);
      }
    }
    if (location_id && !isNaN(parseInt(location_id)) && parseInt(location_id) > 0) {
      conditions.push(`p.location_id = ${parseInt(location_id)}`);
    }
    if (min_price && !isNaN(parseFloat(min_price))) {
      conditions.push(`p.total_price >= ${parseFloat(min_price)}`);
    }
    if (max_price && !isNaN(parseFloat(max_price))) {
      conditions.push(`p.total_price <= ${parseFloat(max_price)}`);
    }
    if (min_area && !isNaN(parseFloat(min_area))) {
      conditions.push(`p.area >= ${parseFloat(min_area)}`);
    }
    if (max_area && !isNaN(parseFloat(max_area))) {
      conditions.push(`p.area <= ${parseFloat(max_area)}`);
    }
    if (rooms && !isNaN(parseInt(rooms))) {
      conditions.push(`p.rooms >= ${parseInt(rooms)}`);
    }
    if (search && search.trim()) {
      const s = search.trim().replace(/'/g, "''");
      conditions.push(`(p.title LIKE '%${s}%' OR p.description LIKE '%${s}%')`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = all(`SELECT COUNT(*) as total FROM properties p ${where}`);
    const total = countResult[0]?.total || 0;

    let orderBy = 'p.created_at DESC';
    if (sort === 'oldest') orderBy = 'p.created_at ASC';
    else if (sort === 'price_asc') orderBy = 'p.total_price ASC';
    else if (sort === 'price_desc') orderBy = 'p.total_price DESC';

    const properties = all(`
      SELECT p.*, l.name as location_name, u.full_name as owner_name,
             (SELECT filepath FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM properties p
      LEFT JOIN locations l ON p.location_id = l.id
      LEFT JOIN users u ON p.owner_id = u.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);

    return res.json({
      success: true,
      properties,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get properties error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/properties/:id
function getProperty(req, res) {
  try {
    const { id } = req.params;

    const property = get(`
      SELECT p.*, l.name as location_name, u.full_name as owner_name, u.phone as owner_phone
      FROM properties p
      LEFT JOIN locations l ON p.location_id = l.id
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = ${parseInt(id)}
    `);

    if (!property) {
      return res.status(404).json({ success: false, message: 'آگهی یافت نشد' });
    }

    const images = all(`SELECT * FROM property_images WHERE property_id = ${parseInt(id)} ORDER BY is_primary DESC`);
    property.images = images;

    return res.json({ success: true, property });
  } catch (err) {
    console.error('Get property error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// POST /api/properties
function createProperty(req, res) {
  try {
    const {
      title, property_type, deed_type, location_id,
      area, total_price, price_per_meter,
      rooms, bathrooms, building_age, floor, direction,
      parking, storage, elevator, description,
      map_lat, map_lng
    } = req.body;

    if (!title || !property_type || !deed_type || !location_id || !area || !total_price) {
      return res.status(400).json({ success: false, message: 'فیلدهای اجباری را پر کنید' });
    }

    const ppm = price_per_meter || (parseFloat(total_price) / parseFloat(area));

    const result = run(`
      INSERT INTO properties 
      (title, property_type, deed_type, location_id, area, total_price, price_per_meter,
       rooms, bathrooms, building_age, floor, direction, parking, storage, elevator,
       description, map_lat, map_lng, owner_id, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [
        title, property_type, deed_type, parseInt(location_id),
        parseFloat(area), parseFloat(total_price), ppm,
        parseInt(rooms) || 0, parseInt(bathrooms) || 0,
        building_age ? parseInt(building_age) : null,
        floor ? parseInt(floor) : null,
        direction || null,
        parking ? 1 : 0, storage ? 1 : 0, elevator ? 1 : 0,
        description || null,
        map_lat ? parseFloat(map_lat) : null,
        map_lng ? parseFloat(map_lng) : null,
        req.user.id
      ]
    );

    logActivity(req.user.id, 'create_property', 'property', result.lastInsertRowid, `آگهی "${title}" ایجاد شد`);

    // Realtime notification به همه کاربران آنلاین
    try {
      const serverModule = require('../server');
      if (serverModule.emitToAll) {
        const newProp = get(`SELECT p.*, l.name as location_name FROM properties p LEFT JOIN locations l ON p.location_id = l.id WHERE p.id = ${result.lastInsertRowid}`);
        serverModule.emitToAll('property:new', {
          id: result.lastInsertRowid,
          title,
          property_type,
          location: newProp?.location_name || '',
          price: parseFloat(total_price),
          owner: req.user.full_name
        });
      }
    } catch(e) {}

    const property = get(`SELECT * FROM properties WHERE id = ${result.lastInsertRowid}`);

    return res.status(201).json({ success: true, message: 'آگهی با موفقیت ثبت شد', property });
  } catch (err) {
    console.error('Create property error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// PUT /api/properties/:id
function updateProperty(req, res) {
  try {
    const { id } = req.params;
    const property = get(`SELECT * FROM properties WHERE id = ${parseInt(id)}`);

    if (!property) {
      return res.status(404).json({ success: false, message: 'آگهی یافت نشد' });
    }

    // Permission check
    const isOwner = property.owner_id === req.user.id;
    const isManagerOrAgent = ['manager', 'agent'].includes(req.user.role);

    if (!isOwner && !isManagerOrAgent) {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }

    const {
      title, property_type, deed_type, location_id,
      area, total_price, price_per_meter,
      rooms, bathrooms, building_age, floor, direction,
      parking, storage, elevator, description,
      map_lat, map_lng
    } = req.body;

    const ppm = price_per_meter || (parseFloat(total_price) / parseFloat(area));

    run(`
      UPDATE properties SET
        title = ?, property_type = ?, deed_type = ?, location_id = ?,
        area = ?, total_price = ?, price_per_meter = ?,
        rooms = ?, bathrooms = ?, building_age = ?, floor = ?,
        direction = ?, parking = ?, storage = ?, elevator = ?,
        description = ?, map_lat = ?, map_lng = ?,
        updated_at = datetime('now')
      WHERE id = ${parseInt(id)}`,
      [
        title, property_type, deed_type, parseInt(location_id),
        parseFloat(area), parseFloat(total_price), ppm,
        parseInt(rooms) || 0, parseInt(bathrooms) || 0,
        building_age ? parseInt(building_age) : null,
        floor ? parseInt(floor) : null,
        direction || null,
        parking ? 1 : 0, storage ? 1 : 0, elevator ? 1 : 0,
        description || null,
        map_lat ? parseFloat(map_lat) : null,
        map_lng ? parseFloat(map_lng) : null
      ]
    );

    logActivity(req.user.id, 'update_property', 'property', parseInt(id), `آگهی "${title}" ویرایش شد`);

    const updated = get(`SELECT * FROM properties WHERE id = ${parseInt(id)}`);
    return res.json({ success: true, message: 'آگهی با موفقیت به‌روزرسانی شد', property: updated });
  } catch (err) {
    console.error('Update property error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// DELETE /api/properties/:id
function deleteProperty(req, res) {
  try {
    const { id } = req.params;
    const property = get(`SELECT * FROM properties WHERE id = ${parseInt(id)}`);

    if (!property) {
      return res.status(404).json({ success: false, message: 'آگهی یافت نشد' });
    }

    const isOwner = property.owner_id === req.user.id;
    const isManager = req.user.role === 'manager';

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }

    // Delete images from filesystem
    const images = all(`SELECT filepath FROM property_images WHERE property_id = ${parseInt(id)}`);
    images.forEach(img => {
      const fullPath = path.join(__dirname, '../../', img.filepath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    run(`DELETE FROM property_images WHERE property_id = ${parseInt(id)}`);
    run(`DELETE FROM properties WHERE id = ${parseInt(id)}`);

    logActivity(req.user.id, 'delete_property', 'property', parseInt(id), `آگهی "${property.title}" حذف شد`);

    return res.json({ success: true, message: 'آگهی با موفقیت حذف شد' });
  } catch (err) {
    console.error('Delete property error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/properties/my - user's own listings
function getMyProperties(req, res) {
  try {
    const properties = all(`
      SELECT p.*, l.name as location_name,
             (SELECT filepath FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM properties p
      LEFT JOIN locations l ON p.location_id = l.id
      WHERE p.owner_id = ${req.user.id}
      ORDER BY p.created_at DESC
    `);
    return res.json({ success: true, properties });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

module.exports = { getProperties, getProperty, createProperty, updateProperty, deleteProperty, getMyProperties };
