const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All admin routes require admin authentication
router.use(authenticate, requireAdmin);

router.get('/appointments', adminController.getAllAppointments);
router.patch('/appointments/:id/status', adminController.updateAppointmentStatus);
router.get('/stats', adminController.getDashboardStats);

module.exports = router;
