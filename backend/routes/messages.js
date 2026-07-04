const express = require('express');
const router = express.Router();
const {
  sendMessage, getInbox, getSent, getUnreadCount,
  getConversation, markAsRead, deleteMessage,
  getContacts, getAgents
} = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/inbox',              getInbox);
router.get('/sent',               getSent);
router.get('/unread-count',       getUnreadCount);
router.get('/contacts',           getContacts);
router.get('/agents',             getAgents);
router.get('/conversation/:userId', getConversation);
router.post('/',                  sendMessage);
router.put('/:id/read',           markAsRead);
router.delete('/:id',             deleteMessage);

module.exports = router;
