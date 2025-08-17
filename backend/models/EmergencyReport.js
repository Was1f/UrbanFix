const mongoose = require('mongoose');

const EmergencyReportSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['Fire', 'Crime', 'Accident', 'Medical', 'Natural Disaster', 'Other Help']
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  reporterName: {
    type: String,
    default: 'Anonymous'
  },
  reporterPhone: {
    type: String
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'in-progress', 'resolved', 'cancelled']
  },
  priority: {
    type: String,
    default: 'medium',
    enum: ['low', 'medium', 'high', 'critical']
  },
  urgency: {
    type: String,
    default: 'moderate',
    enum: ['low', 'moderate', 'high']
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio']
    },
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  }],
  assignedTo: {
    type: String
  },
  adminNotes: {
    type: String
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmergencyReport', EmergencyReportSchema);
