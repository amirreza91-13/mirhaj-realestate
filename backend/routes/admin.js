const express = require('express');
const router = express.Router();
const {
  getUsers, updateUserRole, getRegistrations,
  getLogs, updatePropertyStatus, getStats,
  downloadBackup, getLocations, addLocation
} = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All admin routes require manager role
router.use(authMiddleware);

router.get('/stats', requireRole('manager'), getStats);
router.get('/users', requireRole('manager'), getUsers);
router.put('/users/:id/role', requireRole('manager'), updateUserRole);
router.get('/registrations', requireRole('manager'), getRegistrations);
router.get('/logs', requireRole('manager', 'agent'), getLogs);
router.put('/properties/:id/status', requireRole('manager'), updatePropertyStatus);
router.get('/backup', requireRole('manager'), downloadBackup);
router.post('/locations', requireRole('manager'), addLocation);

module.exports = router;
