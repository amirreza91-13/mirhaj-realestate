const jwt = require('jsonwebtoken');
const { get } = require('../../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'mirhaj_secret_key_2024_fallback';

// Verify JWT token
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'توکن احراز هویت یافت نشد' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = get(`SELECT id, username, full_name, role, avatar, active FROM users WHERE id = ?`, [decoded.id]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'کاربر یافت نشد' });
    }
    if (!user.active) {
      return res.status(403).json({ success: false, message: 'حساب کاربری غیرفعال است' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'توکن نامعتبر است' });
  }
}

// Optional auth - doesn't fail if no token
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = get(`SELECT id, username, full_name, role, avatar, active FROM users WHERE id = ?`, [decoded.id]);
    req.user = user || null;
  } catch {
    req.user = null;
  }
  next();
}

// Role check middleware factory
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'ابتدا وارد شوید' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }
    next();
  };
}

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authMiddleware, optionalAuth, requireRole, generateToken };
