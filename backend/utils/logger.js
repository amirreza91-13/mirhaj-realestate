const { run } = require('../../database/db');

function logActivity(userId, action, targetType = null, targetId = null, details = null) {
  try {
    run(
      `INSERT INTO activity_logs (user_id, action, target_type, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [userId || null, action, targetType, targetId, details]
    );
  } catch (err) {
    console.error('خطا در ثبت لاگ:', err.message);
  }
}

module.exports = { logActivity };
