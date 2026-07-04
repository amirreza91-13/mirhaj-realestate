const { get, run, all } = require('../../database/db');
const { logActivity } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// GET /api/admin/users
function getUsers(req, res) {
  try {
    const users = all(`
      SELECT id, username, full_name, role, avatar, phone, email, location, active, created_at
      FROM users ORDER BY created_at DESC
    `);
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// PUT /api/admin/users/:id/role
function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role, active } = req.body;

    const user = get(`SELECT * FROM users WHERE id = ${parseInt(id)}`);
    if (!user) {
      return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
    }

    // Prevent changing own role
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'نمی‌توانید نقش خود را تغییر دهید' });
    }

    const validRoles = ['manager', 'agent', 'user'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'نقش نامعتبر است' });
    }

    if (role) {
      run(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ${parseInt(id)}`, [role]);
      logActivity(req.user.id, 'change_role', 'user', parseInt(id), `نقش ${user.username} به ${role} تغییر یافت`);
    }

    if (active !== undefined) {
      run(`UPDATE users SET active = ?, updated_at = datetime('now') WHERE id = ${parseInt(id)}`, [active ? 1 : 0]);
      logActivity(req.user.id, active ? 'activate_user' : 'deactivate_user', 'user', parseInt(id), `کاربر ${user.username} ${active ? 'فعال' : 'غیرفعال'} شد`);
    }

    const updated = get(`SELECT id, username, full_name, role, active FROM users WHERE id = ${parseInt(id)}`);
    return res.json({ success: true, message: 'کاربر به‌روزرسانی شد', user: updated });
  } catch (err) {
    console.error('Update user role error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/admin/registrations
function getRegistrations(req, res) {
  try {
    const logs = all(`
      SELECT r.*, u.role, u.active
      FROM registration_logs r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 100
    `);
    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/admin/logs
function getLogs(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const total = all(`SELECT COUNT(*) as count FROM activity_logs`)[0]?.count || 0;

    const logs = all(`
      SELECT a.*, u.username, u.full_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);

    return res.json({
      success: true,
      logs,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// PUT /api/admin/properties/:id/status
function updatePropertyStatus(req, res) {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const property = get(`SELECT * FROM properties WHERE id = ${parseInt(id)}`);
    if (!property) {
      return res.status(404).json({ success: false, message: 'آگهی یافت نشد' });
    }

    run(`UPDATE properties SET active = ?, updated_at = datetime('now') WHERE id = ${parseInt(id)}`, [active ? 1 : 0]);
    logActivity(req.user.id, active ? 'activate_property' : 'deactivate_property', 'property', parseInt(id), `آگهی "${property.title}" ${active ? 'فعال' : 'غیرفعال'} شد`);

    return res.json({ success: true, message: `آگهی ${active ? 'فعال' : 'غیرفعال'} شد` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/admin/stats
function getStats(req, res) {
  try {
    const totalUsers = all(`SELECT COUNT(*) as count FROM users`)[0]?.count || 0;
    const totalProperties = all(`SELECT COUNT(*) as count FROM properties`)[0]?.count || 0;
    const activeProperties = all(`SELECT COUNT(*) as count FROM properties WHERE active = 1`)[0]?.count || 0;
    const totalAgents = all(`SELECT COUNT(*) as count FROM users WHERE role = 'agent'`)[0]?.count || 0;

    const recentProperties = all(`
      SELECT p.title, p.total_price, p.created_at, l.name as location_name
      FROM properties p LEFT JOIN locations l ON p.location_id = l.id
      ORDER BY p.created_at DESC LIMIT 5
    `);

    return res.json({
      success: true,
      stats: { totalUsers, totalProperties, activeProperties, totalAgents },
      recentProperties
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/admin/backup
function downloadBackup(req, res) {
  try {
    const dbPath = path.join(__dirname, '../../database/mirhaj.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, message: 'فایل دیتابیس یافت نشد' });
    }
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename="mirhaj_backup_${date}.db"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(dbPath).pipe(res);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای دانلود بکاپ' });
  }
}

// GET /api/locations (with add support)
function getLocations(req, res) {
  try {
    const locations = all(`SELECT * FROM locations WHERE active = 1 ORDER BY type, name`);
    return res.json({ success: true, locations });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// POST /api/admin/locations
function addLocation(req, res) {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'نام و نوع لوکیشن الزامی است' });
    }
    const existing = get(`SELECT id FROM locations WHERE name = '${name.replace(/'/g, "''")}'`);
    if (existing) {
      return res.status(409).json({ success: false, message: 'این لوکیشن قبلاً ثبت شده' });
    }
    const result = run(`INSERT INTO locations (name, type) VALUES (?, ?)`, [name, type]);
    const location = get(`SELECT * FROM locations WHERE id = ${result.lastInsertRowid}`);
    return res.status(201).json({ success: true, message: 'لوکیشن اضافه شد', location });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

module.exports = { getUsers, updateUserRole, getRegistrations, getLogs, updatePropertyStatus, getStats, downloadBackup, getLocations, addLocation };
