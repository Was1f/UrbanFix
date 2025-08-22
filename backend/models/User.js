// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ----------------------------
  // Basic Identity
  // ----------------------------
  fname: { type: String, required: true, trim: true },
  lname: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }, // hash this before saving

  // ----------------------------
  // Location
  // ----------------------------
  address: { type: String, required: true, trim: true },
  location: {
    type: String,
    trim: true,
    default: 'Dhanmondi' // Default to Dhanmondi as mentioned in your UI
  },

  // ----------------------------
  // Demographics
  // ----------------------------
  dob: { type: Date, required: true },
  gender: { type: String, required: true, trim: true },
  occupation: { type: String, required: true, trim: true },
  skills: { type: String },
  languages: { type: [String], default: ['English (US)'] },

  // ----------------------------
  // Emergency & Safety
  // ----------------------------
  emergencyName: { type: String },
  emergencyPhone: { type: String },
  bloodGroup: { type: String, required: true },
  medicalConditions: { type: String },
  nid: { type: String, trim: true },

  // ----------------------------
  // Profile & Engagement
  // ----------------------------
  profilePic: {
    uri: { type: String }, // This will store the file path like "/uploads/profile/uuid-timestamp.jpg"
    type: { type: String, default: 'image/jpeg' },
    size: { type: Number, default: 0 }
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
  // Ban Management
  // ----------------------------
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, trim: true },
  banDate: { type: Date },
  banExpiryDate: { type: Date }, // null for permanent bans
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

  // ----------------------------
  // Additional Fields
  // ----------------------------
  verificationBadge: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
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

}, { timestamps: true });

// Indexes for efficient lookups
userSchema.index({ phone: 1 });
userSchema.index({ isBanned: 1 });
// Note: location is just a string (city name), not coordinates, so no geospatial index needed

// Virtual for checking if ban is expired
userSchema.virtual('isBanExpired').get(function() {
  if (!this.isBanned || !this.banExpiryDate) return false;
  return Date.now() > this.banExpiryDate;
});

// Method to check if user is currently banned
userSchema.methods.isCurrentlyBanned = function() {
  if (!this.isBanned) return false;
  if (!this.banExpiryDate) return true; // permanent ban
  return Date.now() <= this.banExpiryDate; // temporary ban not expired
};

module.exports = mongoose.model('User', userSchema);
