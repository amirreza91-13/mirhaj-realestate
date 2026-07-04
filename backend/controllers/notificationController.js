const { get, run, all } = require('../../database/db');

// GET /api/notifications
function getNotifications(req, res) {
  try {
    const notifications = all(`
      SELECT * FROM notifications
      WHERE user_id = ${req.user.id}
      ORDER BY created_at DESC
      LIMIT 50
    `);
    return res.json({ success: true, notifications });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/notifications/unread-count
function getUnreadCount(req, res) {
  try {
    const result = all(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ${req.user.id} AND is_read = 0
    `);
    return res.json({ success: true, count: result[0]?.count || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// PUT /api/notifications/:id/read
function markAsRead(req, res) {
  try {
    run(`UPDATE notifications SET is_read = 1 WHERE id = ${parseInt(req.params.id)} AND user_id = ${req.user.id}`);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// PUT /api/notifications/read-all
function markAllAsRead(req, res) {
  try {
    run(`UPDATE notifications SET is_read = 1 WHERE user_id = ${req.user.id}`);
    return res.json({ success: true, message: 'همه خوانده شدند' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// DELETE /api/notifications/:id
function deleteNotification(req, res) {
  try {
    run(`DELETE FROM notifications WHERE id = ${parseInt(req.params.id)} AND user_id = ${req.user.id}`);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// Helper: create notification (used internally)
function createNotification(userId, type, title, body, link = null) {
  try {
    run(
      `INSERT INTO notifications (user_id, type, title, body, link, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'))`,
      [userId, type, title, body, link]
    );
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, createNotification };
