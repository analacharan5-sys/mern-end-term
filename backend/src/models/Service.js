const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Service name must be at least 2 characters'],
      maxlength: [100, 'Service name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
      type: String,
      required: true,
      default: 'General',
      trim: true
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [5, 'Duration must be at least 5 minutes'],
      max: [240, 'Duration cannot exceed 240 minutes'],
      default: 30
    },
    defaultCapacity: {
      type: Number,
      required: [true, 'Default slot capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [100, 'Capacity cannot exceed 100'],
      default: 3
    },
    bufferMinutes: {
      type: Number,
      default: 5,
      min: 0,
      max: 60
    },
    location: {
      type: String,
      trim: true,
      default: 'Campus Center, Room 101'
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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

serviceSchema.index({ isActive: 1, category: 1 });

module.exports = mongoose.model('Service', serviceSchema);
