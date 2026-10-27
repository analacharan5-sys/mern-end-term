const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AvailabilitySlot',
      required: [true, 'Slot ID is required'],
      index: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service ID is required'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['booked', 'checked_in', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid appointment status'
      },
      default: 'booked',
      index: true
    },
    queueNumber: {
      type: Number,
      required: [true, 'Queue number is required'],
      min: 1
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: ''
    },
    checkedInAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for fast lookup and queue calculation
appointmentSchema.index({ userId: 1, slotId: 1, status: 1 });
appointmentSchema.index({ serviceId: 1, status: 1, createdAt: 1 });
appointmentSchema.index({ slotId: 1, status: 1, queueNumber: 1 });
appointmentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
