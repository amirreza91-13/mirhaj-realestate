const express = require('express');
const router = express.Router();
const {
  getProperties, getProperty, createProperty,
  updateProperty, deleteProperty, getMyProperties
} = require('../controllers/propertyController');
const { uploadImage, deleteImage, setPrimaryImage } = require('../controllers/imageController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', optionalAuth, getProperties);
router.get('/my', authMiddleware, getMyProperties);
router.get('/:id', optionalAuth, getProperty);
router.post('/', authMiddleware, createProperty);
router.put('/:id', authMiddleware, updateProperty);
router.delete('/:id', authMiddleware, deleteProperty);

// Image routes
router.post('/:id/images', authMiddleware, upload.single('image'), uploadImage);
router.delete('/images/:id', authMiddleware, deleteImage);
router.put('/images/:id/primary', authMiddleware, setPrimaryImage);

module.exports = router;
