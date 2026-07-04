const express = require('express');
const router = express.Router();
const { getLocations } = require('../controllers/adminController');

router.get('/', getLocations);

module.exports = router;
