const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;

// Public user profile
const { all: dbAll, get: dbGet } = require('../../database/db');
router.get('/users/:id', (req, res) => {
  try {
    const user = dbGet(`SELECT id, full_name, role, avatar, phone, location, created_at FROM users WHERE id = ${parseInt(req.params.id)} AND active = 1`);
    if (!user) return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});
