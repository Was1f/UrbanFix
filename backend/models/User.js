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
  location: {
    type: String,
    trim: true,
    default: 'Dhanmondi' // Default to Dhanmondi as mentioned in your UI
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
  },
  points: {
    total: { type: Number, default: 0 },
    weekly: { type: Number, default: 0 },
    monthly: { type: Number, default: 0 },
    daily: { type: Number, default: 0 }
  },
  stats: {
    postsCreated: { type: Number, default: 0 },
    commentsAdded: { type: Number, default: 0 },
    helpOffered: { type: Number, default: 0 },
    likesGiven: { type: Number, default: 0 },
    eventsAttended: { type: Number, default: 0 },
    donationsMade: { type: Number, default: 0 },
    volunteered: { type: Number, default: 0 },
    pollsVoted: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for efficient lookups
UserSchema.index({ phone: 1 });
UserSchema.index({ location: 1 });

module.exports = mongoose.model('User', UserSchema);