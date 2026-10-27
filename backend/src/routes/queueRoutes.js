const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Queue status for a service
router.get('/service/:serviceId', optionalAuth, queueController.getServiceQueue);

// Queue position for a specific appointment (requires authentication)
router.get('/appointment/:id', authenticate, queueController.getAppointmentQueueStatus);

module.exports = router;
