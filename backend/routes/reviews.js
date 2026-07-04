const express = require('express');
const router = express.Router();
const { addReview, getAgentReviews, getAgentsWithRatings } = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/auth');
router.get('/agents',          getAgentsWithRatings);
router.get('/agent/:agentId',  getAgentReviews);
router.post('/', authMiddleware, addReview);
module.exports = router;
