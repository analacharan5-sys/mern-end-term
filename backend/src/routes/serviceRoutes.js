const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticate, optionalAuth, requireAdmin } = require('../middleware/auth');

router.get('/', optionalAuth, serviceController.getAllServices);
router.get('/:id', optionalAuth, serviceController.getServiceById);

// Administrative operations
router.post('/', authenticate, requireAdmin, serviceController.createService);
router.put('/:id', authenticate, requireAdmin, serviceController.updateService);
router.delete('/:id', authenticate, requireAdmin, serviceController.deleteService);

module.exports = router;
