const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { bookingLimiter } = require('../middleware/rateLimiter');

// All appointment operations require authentication
router.use(authenticate);

router.post('/', bookingLimiter, appointmentController.bookAppointment);
router.get('/my', appointmentController.getMyAppointments);
router.get('/:id', appointmentController.getAppointmentById);
router.patch('/:id/cancel', appointmentController.cancelAppointment);
router.patch('/:id/check-in', appointmentController.checkInAppointment);

module.exports = router;
