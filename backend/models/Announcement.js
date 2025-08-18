const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    required: true,
    enum: [
      'Power Outage',
      'Government Declaration',
      'Flood Warning',
      'Emergency Alert',
      'Public Service',
      'Infrastructure',
      'Health Advisory',
      'Transportation',
      'Weather Alert',
      'Community Event',
      'Other'
    ],
    default: 'Other'
  },
  customType: {
    type: String,
    trim: true,
    maxlength: 50
  },
  time: {
    type: String,
    trim: true,
    maxlength: 100
  },
  image: {
    type: String,
    default: null
  },
  expirationDate: {
    type: Date,
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying of active announcements
announcementSchema.index({ isActive: 1, expirationDate: 1, createdAt: -1 });

// Index for archived announcements
announcementSchema.index({ isArchived: 1, createdAt: -1 });

// Virtual for getting the final type (custom or predefined)
announcementSchema.virtual('finalType').get(function() {
  return this.customType && this.customType.trim() ? this.customType : this.type;
});

// Pre-save middleware to update the updatedAt field
announcementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to archive expired announcements
announcementSchema.statics.archiveExpired = async function() {
  const now = new Date();
  const result = await this.updateMany(
    { 
      expirationDate: { $lt: now },
      isActive: true,
      isArchived: false
    },
    { 
      isActive: false,
      isArchived: true,
      updatedAt: now
    }
  );
  return result;
};

// Method to get active announcements
announcementSchema.statics.getActive = function(limit = null) {
  const query = this.find({ 
    isActive: true, 
    expirationDate: { $gt: new Date() } 
  })
  .sort({ createdAt: -1 })
  .populate('createdBy', 'username email');
  
  if (limit) {
    query.limit(limit);
  }
  
  return query;
};

// Method to get archived announcements
announcementSchema.statics.getArchived = function(limit = null) {
  const query = this.find({ isArchived: true })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'username email');
  
  if (limit) {
    query.limit(limit);
  }
  
  return query;
};

// Ensure indexes are created
announcementSchema.set('toJSON', { virtuals: true });
announcementSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Announcement', announcementSchema);
