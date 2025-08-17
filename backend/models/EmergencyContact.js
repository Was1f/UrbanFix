const mongoose = require('mongoose');

const EmergencyContactSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['Fire Brigade', 'Police Station', 'Emergency', 'Hospital']
  },
  name: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  address: {
    type: String
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmergencyContact', EmergencyContactSchema);
