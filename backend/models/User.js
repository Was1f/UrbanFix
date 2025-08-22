// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ----------------------------
  // Basic Identity
  // ----------------------------
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hash this before saving

  // ----------------------------
  // Location
  // ----------------------------
  address: { type: String, required: true },

  // ----------------------------
  // Demographics
  // ----------------------------
  dob: { type: Date, required: true },
  gender: { type: String, required: true },
  occupation: { type: String, required: true },
  skills: { type: String },
  languages: { type: [String], default: ['English (US)'] },

  // ----------------------------
  // Emergency & Safety
  // ----------------------------
  emergencyName: { type: String },
  emergencyPhone: { type: String },
  bloodGroup: { type: String, required: true },
  medicalConditions: { type: String },
  nid: { type: String },

  // ----------------------------
  // Profile & Engagement
  // ----------------------------
  profilePic: {
    uri: String,
    type: String,
    size: Number
  },
  bio: { type: String },
  helpType: { type: String },

  // ----------------------------
  // OTP / Verification
  // ----------------------------
  isVerified: { type: Boolean, default: false }, // email / phone verification
  otp: {
    code: String,
    expiresAt: Date
  },

  // ----------------------------
  // Timestamps
  // ----------------------------
}, { timestamps: true });
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

module.exports = mongoose.model('User', userSchema);
