const AvailabilitySlot = require('../models/AvailabilitySlot');
const Service = require('../models/Service');

// Helper to convert date + HH:mm to Date object
function parseDateTime(dateStr, timeStr) {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

// Validate HH:mm format
function isValidTimeFormat(timeStr) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr);
}

// Validate YYYY-MM-DD format
function isValidDateFormat(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// GET /api/slots
exports.getSlots = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Connecting to database... Please refresh in a moment.'
      });
    }

    const { serviceId, date, onlyAvailable } = req.query;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'serviceId query parameter is required.'
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Specified service does not exist.'
      });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    if (!service.isActive && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'This campus service is currently inactive. No slots are available.'
      });
    }

    const filter = {
      serviceId,
      isAvailable: true
    };

    if (date) {
      if (!isValidDateFormat(date)) {
        return res.status(400).json({
          success: false,
          message: 'Date must be formatted as YYYY-MM-DD.'
        });
      }
      filter.date = date;
    } else {
      // Default to today and future dates
      const todayStr = new Date().toISOString().split('T')[0];
      filter.date = { $gte: todayStr };
    }

    let slots = await AvailabilitySlot.find(filter).sort({ date: 1, startTime: 1 });

    if (onlyAvailable === 'true') {
      slots = slots.filter((s) => s.bookedCount < s.capacity);
    }

    return res.status(200).json({
      success: true,
      service: {
        id: service._id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        location: service.location,
        isActive: service.isActive
      },
      count: slots.length,
      slots: slots.map((s) => ({
        id: s._id,
        serviceId: s.serviceId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        availableSeats: Math.max(0, s.capacity - s.bookedCount),
        isFull: s.bookedCount >= s.capacity,
        isAvailable: s.isAvailable
      }))
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid service identifier format.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve availability slots',
      error: error.message
    });
  }
};

// POST /api/slots (Admin only)
exports.createSlot = async (req, res) => {
  try {
    const { serviceId, date, startTime, endTime, capacity } = req.body;

    if (!serviceId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'serviceId, date, startTime, and endTime are required.'
      });
    }

    if (!isValidDateFormat(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD.'
      });
    }

    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Expected 24-hour HH:mm (e.g. 09:30).'
      });
    }

    // Interval validation: startTime must be strictly before endTime
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes >= endMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time interval: startTime must be strictly before endTime.'
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    const startDateTime = parseDateTime(date, startTime);
    const endDateTime = parseDateTime(date, endTime);

    // Check for duplicate slot
    const existing = await AvailabilitySlot.findOne({
      serviceId,
      date,
      startTime
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A slot starting at this time already exists for this service and date.'
      });
    }

    const slotCapacity = capacity ? Number(capacity) : service.defaultCapacity;
    if (slotCapacity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be at least 1.'
      });
    }

    const slot = await AvailabilitySlot.create({
      serviceId,
      date,
      startTime,
      endTime,
      startDateTime,
      endDateTime,
      capacity: slotCapacity,
      bookedCount: 0,
      isAvailable: true
    });

    return res.status(201).json({
      success: true,
      message: 'Slot created successfully.',
      slot
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create slot',
      error: error.message
    });
  }
};

// POST /api/slots/generate (Admin only - bulk slot generator)
exports.generateSlots = async (req, res) => {
  try {
    const {
      serviceId,
      date,
      dayStartTime = '09:00',
      dayEndTime = '17:00',
      slotDurationMinutes,
      capacity
    } = req.body;

    if (!serviceId || !date) {
      return res.status(400).json({
        success: false,
        message: 'serviceId and date are required.'
      });
    }

    if (!isValidDateFormat(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD.'
      });
    }

    if (!isValidTimeFormat(dayStartTime) || !isValidTimeFormat(dayEndTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dayStartTime or dayEndTime format (HH:mm).'
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    const duration = Number(slotDurationMinutes) || service.durationMinutes || 30;
    const slotCapacity = Number(capacity) || service.defaultCapacity || 3;

    const [startH, startM] = dayStartTime.split(':').map(Number);
    const [endH, endM] = dayEndTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes >= endMinutes) {
      return res.status(400).json({
        success: false,
        message: 'dayStartTime must be strictly before dayEndTime.'
      });
    }

    const createdSlots = [];
    let skippedCount = 0;

    while (currentMinutes + duration <= endMinutes) {
      const sH = Math.floor(currentMinutes / 60);
      const sM = currentMinutes % 60;
      const eH = Math.floor((currentMinutes + duration) / 60);
      const eM = (currentMinutes + duration) % 60;

      const sTimeStr = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
      const eTimeStr = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;

      const startDateTime = parseDateTime(date, sTimeStr);
      const endDateTime = parseDateTime(date, eTimeStr);

      const exists = await AvailabilitySlot.findOne({
        serviceId,
        date,
        startTime: sTimeStr
      });

      if (!exists) {
        const slot = await AvailabilitySlot.create({
          serviceId,
          date,
          startTime: sTimeStr,
          endTime: eTimeStr,
          startDateTime,
          endDateTime,
          capacity: slotCapacity,
          bookedCount: 0,
          isAvailable: true
        });
        createdSlots.push(slot);
      } else {
        skippedCount++;
      }

      currentMinutes += duration;
    }

    return res.status(201).json({
      success: true,
      message: `Generated ${createdSlots.length} slots for ${date} (${skippedCount} already existed).`,
      count: createdSlots.length,
      slots: createdSlots
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate slots',
      error: error.message
    });
  }
};

// DELETE /api/slots/:id (Admin only)
exports.deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const slot = await AvailabilitySlot.findById(id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found.'
      });
    }

    if (slot.bookedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete slot with ${slot.bookedCount} active booking(s). Please cancel the appointments first.`
      });
    }

    await AvailabilitySlot.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: 'Slot deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete slot',
      error: error.message
    });
  }
};
