const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service ID is required'],
      index: true
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Slot date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true
    },
    startTime: {
      type: String, // Format: HH:mm (24-hour)
      required: [true, 'Start time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:mm 24-hour format']
    },
    endTime: {
      type: String, // Format: HH:mm (24-hour)
      required: [true, 'End time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be in HH:mm 24-hour format']
    },
    startDateTime: {
      type: Date,
      required: true,
      index: true
    },
    endDateTime: {
      type: Date,
      required: true,
      index: true
    },
    capacity: {
      type: Number,
      required: [true, 'Slot capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      default: 3
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: [0, 'Booked count cannot be negative']
    },
    totalTicketSequence: {
      type: Number,
      default: 0
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.availableSeats = Math.max(0, ret.capacity - ret.bookedCount);
        ret.isFull = ret.bookedCount >= ret.capacity;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Prevent duplicate slot definitions for the same service, date, and startTime
availabilitySlotSchema.index({ serviceId: 1, date: 1, startTime: 1 }, { unique: true });
availabilitySlotSchema.index({ serviceId: 1, isAvailable: 1, startDateTime: 1 });
availabilitySlotSchema.index({ date: 1, isAvailable: 1 });

availabilitySlotSchema.virtual('availableSeats').get(function () {
  return Math.max(0, this.capacity - this.bookedCount);
});

availabilitySlotSchema.virtual('isFull').get(function () {
  return this.bookedCount >= this.capacity;
});

module.exports = mongoose.model('AvailabilitySlot', availabilitySlotSchema);
