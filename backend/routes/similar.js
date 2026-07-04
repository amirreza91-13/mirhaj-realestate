const express = require('express');
const router = express.Router();
const { getSimilar } = require('../controllers/similarController');
router.get('/:id', getSimilar);
module.exports = router;
