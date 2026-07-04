const { get, run, all } = require('../../database/db');
const { logActivity } = require('../utils/logger');

// POST /api/messages - ارسال پیام
function sendMessage(req, res) {
  try {
    const { receiver_id, property_id, subject, body } = req.body;

    if (!receiver_id || !body) {
      return res.status(400).json({ success: false, message: 'گیرنده و متن پیام الزامی است' });
    }

    if (parseInt(receiver_id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'نمی‌توانید به خودتان پیام بفرستید' });
    }

    const receiver = get(`SELECT id, full_name FROM users WHERE id = ${parseInt(receiver_id)}`);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'کاربر مورد نظر یافت نشد' });
    }

    const result = run(
      `INSERT INTO messages (sender_id, receiver_id, property_id, subject, body, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'))`,
      [
        req.user.id,
        parseInt(receiver_id),
        property_id ? parseInt(property_id) : null,
        subject || null,
        body
      ]
    );

    // Realtime: پیام رو بلادرنگ به گیرنده بفرست
    try {
      const serverModule = require('../server');
      if (serverModule.emitToUser) {
        serverModule.emitToUser(parseInt(receiver_id), 'message:new', {
          id: result.lastInsertRowid,
          sender_id: req.user.id,
          sender_name: req.user.full_name,
          body,
          subject: subject || null,
          property_id: property_id || null,
          created_at: new Date().toISOString()
        });
      }
    } catch(e) {}

    logActivity(req.user.id, 'send_message', 'message', result.lastInsertRowid,
      `پیام به ${receiver.full_name} ارسال شد`);

    const message = get(`SELECT * FROM messages WHERE id = ${result.lastInsertRowid}`);
    return res.status(201).json({ success: true, message: 'پیام ارسال شد', data: message });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/messages/inbox - صندوق ورودی
function getInbox(req, res) {
  try {
    const messages = all(`
      SELECT m.*,
             u.full_name as sender_name, u.avatar as sender_avatar,
             p.title as property_title
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN properties p ON m.property_id = p.id
      WHERE m.receiver_id = ${req.user.id}
      ORDER BY m.created_at DESC
    `);
    return res.json({ success: true, messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/messages/sent - پیام‌های ارسال شده
function getSent(req, res) {
  try {
    const messages = all(`
      SELECT m.*,
             u.full_name as receiver_name, u.avatar as receiver_avatar,
             p.title as property_title
      FROM messages m
      LEFT JOIN users u ON m.receiver_id = u.id
      LEFT JOIN properties p ON m.property_id = p.id
      WHERE m.sender_id = ${req.user.id}
      ORDER BY m.created_at DESC
    `);
    return res.json({ success: true, messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/messages/unread-count - تعداد پیام‌های خوانده نشده
function getUnreadCount(req, res) {
  try {
    const result = all(`
      SELECT COUNT(*) as count FROM messages
      WHERE receiver_id = ${req.user.id} AND is_read = 0
    `);
    return res.json({ success: true, count: result[0]?.count || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/messages/conversation/:userId - مکالمه با یک کاربر
function getConversation(req, res) {
  try {
    const { userId } = req.params;
    const myId = req.user.id;
    const otherId = parseInt(userId);

    const messages = all(`
      SELECT m.*,
             s.full_name as sender_name, s.avatar as sender_avatar,
             p.title as property_title
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN properties p ON m.property_id = p.id
      WHERE (m.sender_id = ${myId} AND m.receiver_id = ${otherId})
         OR (m.sender_id = ${otherId} AND m.receiver_id = ${myId})
      ORDER BY m.created_at ASC
    `);

    // Mark as read
    run(`UPDATE messages SET is_read = 1
         WHERE receiver_id = ${myId} AND sender_id = ${otherId} AND is_read = 0`);

    const otherUser = get(`SELECT id, full_name, avatar, role FROM users WHERE id = ${otherId}`);

    return res.json({ success: true, messages, otherUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// PUT /api/messages/:id/read - علامت خوانده شده
function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const msg = get(`SELECT * FROM messages WHERE id = ${parseInt(id)}`);
    if (!msg) return res.status(404).json({ success: false, message: 'پیام یافت نشد' });
    if (msg.receiver_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }
    run(`UPDATE messages SET is_read = 1 WHERE id = ${parseInt(id)}`);
    return res.json({ success: true, message: 'پیام خوانده شد' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// DELETE /api/messages/:id
function deleteMessage(req, res) {
  try {
    const { id } = req.params;
    const msg = get(`SELECT * FROM messages WHERE id = ${parseInt(id)}`);
    if (!msg) return res.status(404).json({ success: false, message: 'پیام یافت نشد' });
    if (msg.sender_id !== req.user.id && msg.receiver_id !== req.user.id && req.user.role !== 'manager') {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }
    run(`DELETE FROM messages WHERE id = ${parseInt(id)}`);
    return res.json({ success: true, message: 'پیام حذف شد' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/messages/contacts - لیست مخاطبین
function getContacts(req, res) {
  try {
    const myId = req.user.id;
    const contacts = all(`
      SELECT DISTINCT
        CASE WHEN m.sender_id = ${myId} THEN m.receiver_id ELSE m.sender_id END as user_id,
        u.full_name, u.avatar, u.role,
        MAX(m.created_at) as last_message_time,
        (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ${myId} AND is_read = 0) as unread_count,
        (SELECT body FROM messages
         WHERE (sender_id = ${myId} AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ${myId})
         ORDER BY created_at DESC LIMIT 1) as last_message
      FROM messages m
      LEFT JOIN users u ON u.id = CASE WHEN m.sender_id = ${myId} THEN m.receiver_id ELSE m.sender_id END
      WHERE m.sender_id = ${myId} OR m.receiver_id = ${myId}
      GROUP BY user_id
      ORDER BY last_message_time DESC
    `);
    return res.json({ success: true, contacts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/messages/agents - لیست مشاوران برای تماس
function getAgents(req, res) {
  try {
    const agents = all(`
      SELECT id, full_name, avatar, role, phone
      FROM users
      WHERE role IN ('agent', 'manager') AND active = 1 AND id != ${req.user.id}
      ORDER BY role DESC, full_name
    `);
    return res.json({ success: true, agents });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

module.exports = {
  sendMessage, getInbox, getSent, getUnreadCount,
  getConversation, markAsRead, deleteMessage,
  getContacts, getAgents
};
