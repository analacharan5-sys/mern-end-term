const Service = require('../models/Service');
const Appointment = require('../models/Appointment');

// GET /api/services
exports.getAllServices = async (req, res) => {
  try {
    const { category, search, includeInactive } = req.query;
    const filter = {};

    // Only admins can see inactive services if requested
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin || includeInactive !== 'true') {
      filter.isActive = true;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const services = await Service.find(filter).sort({ name: 1 });
    return res.status(200).json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve campus services',
      error: error.message
    });
  }
};

// GET /api/services/:id
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    if (!service.isActive && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: 'This campus service is currently inactive and not accepting appointments.'
      });
    }

    return res.status(200).json({
      success: true,
      service
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
      message: 'Failed to retrieve service',
      error: error.message
    });
  }
};

// POST /api/services (Admin only)
exports.createService = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      durationMinutes,
      defaultCapacity,
      bufferMinutes,
      location,
      contactEmail,
      isActive
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Service name and description are required.'
      });
    }

    const existing = await Service.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A service with this name already exists.'
      });
    }

    const service = await Service.create({
      name: name.trim(),
      description: description.trim(),
      category: category || 'General',
      durationMinutes: Number(durationMinutes) || 30,
      defaultCapacity: Number(defaultCapacity) || 3,
      bufferMinutes: bufferMinutes !== undefined ? Number(bufferMinutes) : 5,
      location: location ? location.trim() : 'Campus Center, Room 101',
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      service
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create service',
      error: error.message
    });
  }
};

// PUT /api/services/:id (Admin only)
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      durationMinutes,
      defaultCapacity,
      bufferMinutes,
      location,
      contactEmail,
      isActive
    } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    if (name && name.trim() !== service.name) {
      const existing = await Service.findOne({ name: name.trim(), _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Another service already exists with this name.'
        });
      }
      service.name = name.trim();
    }

    if (description !== undefined) service.description = description.trim();
    if (category !== undefined) service.category = category;
    if (durationMinutes !== undefined) service.durationMinutes = Number(durationMinutes);
    if (defaultCapacity !== undefined) service.defaultCapacity = Number(defaultCapacity);
    if (bufferMinutes !== undefined) service.bufferMinutes = Number(bufferMinutes);
    if (location !== undefined) service.location = location.trim();
    if (contactEmail !== undefined) service.contactEmail = contactEmail.trim().toLowerCase();
    if (isActive !== undefined) service.isActive = Boolean(isActive);

    await service.save();

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully.',
      service
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid service identifier format.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Failed to update service',
      error: error.message
    });
  }
};

// DELETE /api/services/:id (Admin only)
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    // Check if there are active appointments for this service
    const activeAppointments = await Appointment.countDocuments({
      serviceId: id,
      status: { $in: ['booked', 'checked_in'] }
    });

    if (activeAppointments > 0) {
      // Instead of hard deleting, deactivate to preserve referential integrity
      service.isActive = false;
      await service.save();
      return res.status(200).json({
        success: true,
        message: `Service has ${activeAppointments} active appointment(s). It has been deactivated instead of permanently deleted to preserve existing records.`,
        deactivated: true
      });
    }

    await Service.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: 'Service deleted successfully.'
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
      message: 'Failed to delete service',
      error: error.message
    });
  }
};
