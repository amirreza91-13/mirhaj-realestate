const bcrypt = require('bcrypt');
const { get, run, all } = require('../../database/db');
const { generateToken } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// POST /api/auth/register
async function register(req, res) {
  try {
    const { username, password, full_name, phone, email, location } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'نام کاربری، رمز عبور و نام کامل الزامی است' });
    }

    const existing = get(`SELECT id FROM users WHERE username = ?`, [username]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'این نام کاربری قبلاً ثبت شده است' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = run(
      `INSERT INTO users (username, password, full_name, phone, email, location, role, avatar, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'user', 1, datetime('now'), datetime('now'))`,
      [username, hashedPassword, full_name, phone || null, email || null, location || null]
    );

    const userId = result.lastInsertRowid;

    run(
      `INSERT INTO registration_logs (user_id, username, full_name, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [userId, username, full_name]
    );

    logActivity(userId, 'register', 'user', userId, `کاربر ${username} ثبت‌نام کرد`);

    const user = get(`SELECT id, username, full_name, role, avatar, phone, email, location FROM users WHERE id = ?`, [userId]);
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'ثبت‌نام با موفقیت انجام شد',
      token,
      user
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'نام کاربری و رمز عبور الزامی است' });
    }

    const user = get(`SELECT * FROM users WHERE username = ?`, [username]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    if (!user.active) {
      return res.status(403).json({ success: false, message: 'حساب کاربری شما غیرفعال است' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    logActivity(user.id, 'login', 'user', user.id, `کاربر ${username} وارد شد`);

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'ورود موفق',
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        email: user.email,
        location: user.location
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/auth/profile
function getProfile(req, res) {
  try {
    const user = get(
      `SELECT id, username, full_name, role, avatar, phone, email, location, created_at FROM users WHERE id = ?`,
      [req.user.id]
    );
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// PUT /api/auth/profile
async function updateProfile(req, res) {
  try {
    const { full_name, phone, email, location, avatar, current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!full_name) {
      return res.status(400).json({ success: false, message: 'نام کامل الزامی است' });
    }

    if (avatar && (avatar < 1 || avatar > 5)) {
      return res.status(400).json({ success: false, message: 'آواتار انتخابی معتبر نیست' });
    }

    // If changing password
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ success: false, message: 'رمز عبور فعلی الزامی است' });
      }
      const user = get(`SELECT password FROM users WHERE id = ?`, [userId]);
      const match = await bcrypt.compare(current_password, user.password);
      if (!match) {
        return res.status(401).json({ success: false, message: 'رمز عبور فعلی اشتباه است' });
      }
      const hashed = await bcrypt.hash(new_password, 10);
      run(
        `UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`,
        [hashed, userId]
      );
    }

    run(
      `UPDATE users SET full_name = ?, phone = ?, email = ?, location = ?, avatar = ?, updated_at = datetime('now') WHERE id = ?`,
      [full_name, phone || null, email || null, location || null, avatar || 1, userId]
    );

    logActivity(userId, 'update_profile', 'user', userId, 'پروفایل به‌روزرسانی شد');

    const updated = get(
      `SELECT id, username, full_name, role, avatar, phone, email, location FROM users WHERE id = ?`,
      [userId]
    );

    return res.json({ success: true, message: 'پروفایل با موفقیت به‌روزرسانی شد', user: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

module.exports = { register, login, getProfile, updateProfile };
