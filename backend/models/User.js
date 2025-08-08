// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  avatar: { 
    type: String, 
    default: null 
  },
  bio: { 
    type: String, 
    maxlength: 500 
  },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: [Number] // [longitude, latitude]
  },
  joinedBoards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Board' }],
  reputation: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Add geospatial index
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);