const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const mongoose = require('mongoose');

// GET /api/admin/appointments
exports.getAllAppointments = async (req, res) => {
  try {
    const { serviceId, date, status, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
      filter.serviceId = serviceId;
    }

    if (status) {
      filter.status = status;
    }

    // Filter by slot date if specified
    if (date) {
      const slotsOnDate = await AvailabilitySlot.find({ date }).select('_id');
      const slotIds = slotsOnDate.map((s) => s._id);
      filter.slotId = { $in: slotIds };
    }

    const appointments = await Appointment.find(filter)
      .populate('serviceId', 'name category durationMinutes location')
      .populate('slotId', 'date startTime endTime capacity bookedCount')
      .populate('userId', 'name email studentId department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalCount = await Appointment.countDocuments(filter);

    return res.status(200).json({
      success: true,
      count: appointments.length,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / limit),
      appointments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments list',
      error: error.message
    });
  }
};

// PATCH /api/admin/appointments/:id/status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, cancellationReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format.'
      });
    }

    const validStatuses = ['booked', 'checked_in', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    const currentStatus = appointment.status;

    // Disallow modifying terminal states
    if (currentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify an appointment that is already marked as completed.'
      });
    }

    if (currentStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify an appointment that is already cancelled.'
      });
    }

    // Disallow no-op same status
    if (currentStatus === status) {
      return res.status(400).json({
        success: false,
        message: `Appointment is already in '${status}' status.`
      });
    }

    // Allowed transition logic:
    // booked -> checked_in, completed, cancelled
    // checked_in -> completed, cancelled
    let slotCapacityAdjustment = 0;

    if (status === 'checked_in') {
      if (currentStatus !== 'booked') {
        return res.status(400).json({
          success: false,
          message: `Cannot check in appointment from status '${currentStatus}'.`
        });
      }
      appointment.checkedInAt = new Date();
    } else if (status === 'completed') {
      if (currentStatus !== 'checked_in' && currentStatus !== 'booked') {
        return res.status(400).json({
          success: false,
          message: `Cannot complete appointment from status '${currentStatus}'.`
        });
      }
      if (!appointment.checkedInAt) {
        appointment.checkedInAt = new Date();
      }
      appointment.completedAt = new Date();
    } else if (status === 'cancelled') {
      appointment.cancelledAt = new Date();
      appointment.cancellationReason = cancellationReason || 'Cancelled by administrator';
      slotCapacityAdjustment = -1; // release capacity
    }

    appointment.status = status;
    if (notes !== undefined) {
      appointment.notes = notes.trim();
    }

    await appointment.save();

    if (slotCapacityAdjustment !== 0) {
      await AvailabilitySlot.findByIdAndUpdate(appointment.slotId, {
        $inc: { bookedCount: slotCapacityAdjustment }
      });
    }

    await appointment.populate([
      { path: 'serviceId', select: 'name' },
      { path: 'slotId', select: 'date startTime endTime' },
      { path: 'userId', select: 'name email studentId' }
    ]);

    return res.status(200).json({
      success: true,
      message: `Appointment status updated from '${currentStatus}' to '${status}'.`,
      appointment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update appointment status',
      error: error.message
    });
  }
};

// GET /api/admin/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate, serviceId } = req.query;

    // Build slot filter for date range
    const slotFilter = {};
    if (startDate && endDate) {
      slotFilter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      slotFilter.date = { $gte: startDate };
    } else if (endDate) {
      slotFilter.date = { $lte: endDate };
    }

    if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
      slotFilter.serviceId = new mongoose.Types.ObjectId(serviceId);
    }

    // 1. Total Services
    const totalServices = await Service.countDocuments();
    const activeServices = await Service.countDocuments({ isActive: true });

    // 2. Slots & Capacity in scope
    const slots = await AvailabilitySlot.find(slotFilter);
    const totalSlots = slots.length;
    const totalCapacity = slots.reduce((acc, s) => acc + (s.capacity || 0), 0);
    const totalBookedSeats = slots.reduce((acc, s) => acc + (s.bookedCount || 0), 0);

    const slotIds = slots.map((s) => s._id);

    // 3. Appointments aggregation in scope
    const appointmentFilter = {};
    if (slotIds.length > 0) {
      appointmentFilter.slotId = { $in: slotIds };
    } else if (startDate || endDate) {
      // Date filter applied but no slots exist for it
      appointmentFilter.slotId = { $in: [] };
    }

    if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
      appointmentFilter.serviceId = new mongoose.Types.ObjectId(serviceId);
    }

    const appointments = await Appointment.find(appointmentFilter);
    const totalAppointments = appointments.length;

    const countsByStatus = {
      booked: 0,
      checked_in: 0,
      completed: 0,
      cancelled: 0
    };

    appointments.forEach((apt) => {
      if (countsByStatus[apt.status] !== undefined) {
        countsByStatus[apt.status]++;
      }
    });

    // Capacity Utilization: active/served appointments divided by total available capacity
    const activeOrServed = countsByStatus.booked + countsByStatus.checked_in + countsByStatus.completed;
    const utilizationRate = totalCapacity > 0 ? Number(((activeOrServed / totalCapacity) * 100).toFixed(1)) : 0;
    const completionRate = totalAppointments > 0 ? Number(((countsByStatus.completed / totalAppointments) * 100).toFixed(1)) : 0;
    const cancellationRate = totalAppointments > 0 ? Number(((countsByStatus.cancelled / totalAppointments) * 100).toFixed(1)) : 0;

    // 4. Breakdown by Service
    const services = await Service.find();
    const serviceBreakdown = await Promise.all(
      services.map(async (svc) => {
        const svcSlotFilter = { serviceId: svc._id, ...slotFilter };
        const svcSlots = await AvailabilitySlot.find(svcSlotFilter);
        const svcCapacity = svcSlots.reduce((acc, s) => acc + (s.capacity || 0), 0);
        const svcSlotIds = svcSlots.map((s) => s._id);

        const svcAppointments = await Appointment.find({ slotId: { $in: svcSlotIds } });
        const svcBooked = svcAppointments.filter((a) => a.status === 'booked').length;
        const svcCheckedIn = svcAppointments.filter((a) => a.status === 'checked_in').length;
        const svcCompleted = svcAppointments.filter((a) => a.status === 'completed').length;
        const svcCancelled = svcAppointments.filter((a) => a.status === 'cancelled').length;

        const svcActiveOrServed = svcBooked + svcCheckedIn + svcCompleted;
        const svcUtilRate = svcCapacity > 0 ? Number(((svcActiveOrServed / svcCapacity) * 100).toFixed(1)) : 0;

        return {
          serviceId: svc._id,
          name: svc.name,
          category: svc.category,
          isActive: svc.isActive,
          totalSlots: svcSlots.length,
          totalCapacity: svcCapacity,
          totalAppointments: svcAppointments.length,
          booked: svcBooked,
          checkedIn: svcCheckedIn,
          completed: svcCompleted,
          cancelled: svcCancelled,
          utilizationRate: svcUtilRate
        };
      })
    );

    return res.status(200).json({
      success: true,
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        serviceId: serviceId || null
      },
      summary: {
        totalServices,
        activeServices,
        totalSlots,
        totalCapacity,
        totalBookedSeats,
        totalAppointments,
        statusCounts: countsByStatus,
        utilizationRate,
        completionRate,
        cancellationRate
      },
      serviceBreakdown
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate admin statistics',
      error: error.message
    });
  }
};
