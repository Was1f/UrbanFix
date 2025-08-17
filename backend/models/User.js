const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fname: { 
    type: String, 
    required: true, 
    trim: true 
  },
  lname: { 
    type: String, 
    required: true, 
    trim: true 
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  email: { 
    type: String, 
    trim: true,
    lowercase: true
  },
  address: { 
    type: String, 
    trim: true 
  },
  profession: { 
    type: String, 
    trim: true 
  },
  gender: { 
    type: String, 
    trim: true 
  },
  nid: { 
    type: String, 
    trim: true 
  },
  verificationBadge: { 
    type: Boolean, 
    default: false 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

// Index for efficient phone lookup
UserSchema.index({ phone: 1 });

module.exports = mongoose.model('User', UserSchema);
