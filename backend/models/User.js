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

module.exports = mongoose.model('User', userSchema);
