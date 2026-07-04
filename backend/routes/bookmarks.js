const express = require('express');
const router = express.Router();
const { toggleBookmark, getBookmarks, checkBookmark } = require('../controllers/bookmarkController');
const { authMiddleware } = require('../middleware/auth');
router.use(authMiddleware);
router.get('/', getBookmarks);
router.get('/check/:propertyId', checkBookmark);
router.post('/:propertyId', toggleBookmark);
module.exports = router;
