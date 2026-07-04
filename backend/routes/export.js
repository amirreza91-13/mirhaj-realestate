const express = require('express');
const router = express.Router();
const { exportPropertiesExcel, exportUsersExcel, exportSummary } = require('../controllers/exportController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/properties', requireRole('manager', 'agent'), exportPropertiesExcel);
router.get('/users',      requireRole('manager'),           exportUsersExcel);
router.get('/summary',    requireRole('manager', 'agent'),  exportSummary);

module.exports = router;
