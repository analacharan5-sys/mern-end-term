const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const { authenticate, optionalAuth, requireAdmin } = require('../middleware/auth');

router.get('/', optionalAuth, slotController.getSlots);

// Administrative operations
router.post('/', authenticate, requireAdmin, slotController.createSlot);
router.post('/generate', authenticate, requireAdmin, slotController.generateSlots);
router.delete('/:id', authenticate, requireAdmin, slotController.deleteSlot);

module.exports = router;
