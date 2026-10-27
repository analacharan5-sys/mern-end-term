const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const mongoose = require('mongoose');

// GET /api/queue/service/:serviceId
exports.getServiceQueue = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID format.'
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // Find all slots for this service on target date
    const slots = await AvailabilitySlot.find({
      serviceId,
      date: targetDate
    }).sort({ startTime: 1 });

    const slotIds = slots.map((s) => s._id);

    // Find active appointments for these slots
    const activeAppointments = await Appointment.find({
      slotId: { $in: slotIds },
      status: { $in: ['booked', 'checked_in'] }
    })
      .populate('userId', 'name studentId email')
      .populate('slotId', 'startTime endTime')
      .sort({ 'slotId.startTime': 1, queueNumber: 1 });

    const isAdmin = req.user && req.user.role === 'admin';

    // Format queue items, masking student data if not admin
    const queueList = activeAppointments.map((apt, index) => {
      const position = index + 1;
      const aheadCount = index;
      const estimatedWait = aheadCount * service.durationMinutes;

      let displayName = 'Student';
      if (apt.userId) {
        if (isAdmin) {
          displayName = apt.userId.name;
        } else {
          // Privacy masking: e.g. "John D."
          const parts = apt.userId.name.split(' ');
          displayName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
        }
      }

      return {
        id: apt._id,
        queueNumber: apt.queueNumber,
        position,
        aheadCount,
        estimatedWaitMinutes: estimatedWait,
        status: apt.status,
        startTime: apt.slotId?.startTime,
        endTime: apt.slotId?.endTime,
        studentName: displayName,
        studentId: isAdmin ? apt.userId?.studentId : undefined,
        checkedInAt: apt.checkedInAt
      };
    });

    // Check count of completed and cancelled today
    const completedCount = await Appointment.countDocuments({
      slotId: { $in: slotIds },
      status: 'completed'
    });

    const cancelledCount = await Appointment.countDocuments({
      slotId: { $in: slotIds },
      status: 'cancelled'
    });

    return res.status(200).json({
      success: true,
      service: {
        id: service._id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        location: service.location
      },
      date: targetDate,
      currentlyServing: queueList.length > 0 ? queueList[0] : null,
      activeQueueCount: queueList.length,
      completedTodayCount: completedCount,
      cancelledTodayCount: cancelledCount,
      queue: queueList
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve queue status',
      error: error.message
    });
  }
};

// GET /api/queue/appointment/:id
exports.getAppointmentQueueStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format.'
      });
    }

    const appointment = await Appointment.findById(id)
      .populate('serviceId', 'name durationMinutes location')
      .populate('slotId', 'date startTime endTime')
      .populate('userId', 'name studentId email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // Role check: Only the owner or an admin can view details
    const isOwner = appointment.userId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view this appointment queue status.'
      });
    }

    // Calculate queue position if active
    let positionInLine = null;
    let aheadCount = 0;
    let estimatedWaitMinutes = 0;

    if (appointment.status === 'booked' || appointment.status === 'checked_in') {
      aheadCount = await Appointment.countDocuments({
        slotId: appointment.slotId._id,
        status: { $in: ['booked', 'checked_in'] },
        queueNumber: { $lt: appointment.queueNumber }
      });
      positionInLine = aheadCount + 1;
      estimatedWaitMinutes = aheadCount * (appointment.serviceId?.durationMinutes || 30);
    }

    return res.status(200).json({
      success: true,
      appointment: {
        id: appointment._id,
        status: appointment.status,
        queueNumber: appointment.queueNumber,
        service: appointment.serviceId,
        slot: appointment.slotId,
        student: {
          name: appointment.userId.name,
          studentId: appointment.userId.studentId
        },
        checkedInAt: appointment.checkedInAt,
        completedAt: appointment.completedAt,
        cancelledAt: appointment.cancelledAt,
        reason: appointment.reason
      },
      queue: {
        status: appointment.status,
        positionInLine,
        aheadCount,
        estimatedWaitMinutes,
        canCheckIn: appointment.status === 'booked',
        canCancel: appointment.status === 'booked' || appointment.status === 'checked_in'
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve queue position',
      error: error.message
    });
  }
};
