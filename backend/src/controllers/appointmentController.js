const Appointment = require('../models/Appointment');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const Service = require('../models/Service');
const mongoose = require('mongoose');

// Helper to compute dynamic queue position for an appointment
async function calculateQueuePosition(appointment) {
  if (appointment.status !== 'booked' && appointment.status !== 'checked_in') {
    return {
      positionInLine: null,
      aheadCount: 0,
      estimatedWaitMinutes: 0
    };
  }

  // Active appointments ahead are those for the same service and slot,
  // or on the same date/slot that are booked or checked_in and were created earlier or have smaller queueNumber
  const aheadCount = await Appointment.countDocuments({
    slotId: appointment.slotId,
    status: { $in: ['booked', 'checked_in'] },
    queueNumber: { $lt: appointment.queueNumber }
  });

  const duration = appointment.serviceId?.durationMinutes || 30;
  const positionInLine = aheadCount + 1;
  const estimatedWaitMinutes = aheadCount * duration;

  return {
    positionInLine,
    aheadCount,
    estimatedWaitMinutes
  };
}

// POST /api/appointments
exports.bookAppointment = async (req, res) => {
  const { slotId, reason } = req.body;
  const userId = req.user._id;

  if (!slotId) {
    return res.status(400).json({
      success: false,
      message: 'slotId is required to book an appointment.'
    });
  }

  if (!mongoose.Types.ObjectId.isValid(slotId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid slot identifier format.'
    });
  }

  try {
    // 1. Check if the slot exists and service is active
    const slot = await AvailabilitySlot.findById(slotId).populate('serviceId');
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'The requested time slot was not found.'
      });
    }

    if (!slot.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is closed for bookings.'
      });
    }

    if (!slot.serviceId || !slot.serviceId.isActive) {
      return res.status(400).json({
        success: false,
        message: 'The service for this slot is currently inactive.'
      });
    }

    // 2. Reject duplicate active bookings for the same user on this slot
    const existingActiveBooking = await Appointment.findOne({
      userId,
      slotId,
      status: { $in: ['booked', 'checked_in'] }
    });

    if (existingActiveBooking) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active appointment booked for this time slot.'
      });
    }

    // 3. Prevent duplicate active booking for the same user across overlapping slots on the same date/time
    const overlappingBooking = await Appointment.findOne({
      userId,
      status: { $in: ['booked', 'checked_in'] }
    }).populate({
      path: 'slotId',
      match: {
        date: slot.date,
        $or: [
          {
            startDateTime: { $lt: slot.endDateTime },
            endDateTime: { $gt: slot.startDateTime }
          }
        ]
      }
    });

    if (overlappingBooking && overlappingBooking.slotId) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active appointment scheduled during an overlapping time window.'
      });
    }

    // 4. Concurrency-Safe Atomic Capacity Increment
    // Uses findOneAndUpdate with condition that bookedCount < capacity
    const reservedSlot = await AvailabilitySlot.findOneAndUpdate(
      {
        _id: slotId,
        isAvailable: true,
        $expr: { $lt: ['$bookedCount', '$capacity'] }
      },
      {
        $inc: { bookedCount: 1, totalTicketSequence: 1 }
      },
      {
        new: true
      }
    );

    if (!reservedSlot) {
      return res.status(409).json({
        success: false,
        message: 'Slot capacity reached. This slot is now fully booked.'
      });
    }

    // 5. Concurrency-safe sequential queue ticket assignment directly from atomic counter
    const queueNumber = reservedSlot.totalTicketSequence || reservedSlot.bookedCount;

    // 6. Create the appointment document
    let appointment;
    try {
      appointment = await Appointment.create({
        slotId: reservedSlot._id,
        serviceId: slot.serviceId._id,
        userId,
        status: 'booked',
        queueNumber,
        reason: reason ? reason.trim() : ''
      });
    } catch (saveError) {
      // Compensating atomic rollback if document creation fails
      await AvailabilitySlot.findByIdAndUpdate(slotId, {
        $inc: { bookedCount: -1 }
      });
      throw saveError;
    }

    // Populate references for clean response
    await appointment.populate([
      { path: 'serviceId', select: 'name category durationMinutes location' },
      { path: 'slotId', select: 'date startTime endTime startDateTime endDateTime capacity bookedCount' },
      { path: 'userId', select: 'name email studentId' }
    ]);

    const queueInfo = await calculateQueuePosition(appointment);

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointment,
      queue: queueInfo
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to process appointment booking',
      error: error.message
    });
  }
};

// GET /api/appointments/my
exports.getMyAppointments = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user._id };

    if (status) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate('serviceId', 'name category durationMinutes location')
      .populate('slotId', 'date startTime endTime capacity bookedCount isAvailable')
      .sort({ createdAt: -1 });

    // Attach dynamic queue calculation to each appointment
    const enrichedAppointments = await Promise.all(
      appointments.map(async (apt) => {
        const queue = await calculateQueuePosition(apt);
        return {
          ...apt.toObject(),
          queue
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: enrichedAppointments.length,
      appointments: enrichedAppointments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your appointments',
      error: error.message
    });
  }
};

// GET /api/appointments/:id
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format.'
      });
    }

    const appointment = await Appointment.findById(id)
      .populate('serviceId', 'name category durationMinutes location contactEmail')
      .populate('slotId', 'date startTime endTime capacity bookedCount')
      .populate('userId', 'name email studentId department');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // Role check: Only the owner or an admin can view
    const isOwner = appointment.userId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this appointment.'
      });
    }

    const queue = await calculateQueuePosition(appointment);

    return res.status(200).json({
      success: true,
      appointment,
      queue
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointment details',
      error: error.message
    });
  }
};

// PATCH /api/appointments/:id/cancel
exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format.'
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // Role check: Owner or Admin
    const isOwner = appointment.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to cancel this appointment.'
      });
    }

    // Validate state transitions
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This appointment is already cancelled.'
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an appointment that has already been completed.'
      });
    }

    // Transition state to cancelled
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason || (isOwner ? 'Cancelled by student' : 'Cancelled by administrator');
    await appointment.save();

    // Release capacity atomically on the slot
    await AvailabilitySlot.findByIdAndUpdate(appointment.slotId, {
      $inc: { bookedCount: -1 }
    });

    await appointment.populate([
      { path: 'serviceId', select: 'name' },
      { path: 'slotId', select: 'date startTime endTime' }
    ]);

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully. Slot capacity has been restored.',
      appointment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message
    });
  }
};

// PATCH /api/appointments/:id/check-in
exports.checkInAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format.'
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    const isOwner = appointment.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot check in to another user\'s appointment.'
      });
    }

    // Validate state transition
    if (appointment.status === 'checked_in') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already checked in.'
      });
    }

    if (appointment.status !== 'booked') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in from status '${appointment.status}'. Must be in 'booked' state.`
      });
    }

    appointment.status = 'checked_in';
    appointment.checkedInAt = new Date();
    await appointment.save();

    await appointment.populate([
      { path: 'serviceId', select: 'name durationMinutes location' },
      { path: 'slotId', select: 'date startTime endTime' }
    ]);

    const queue = await calculateQueuePosition(appointment);

    return res.status(200).json({
      success: true,
      message: 'Successfully checked in! You are in the active queue.',
      appointment,
      queue
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check in',
      error: error.message
    });
  }
};
