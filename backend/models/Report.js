// unused

const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  discussionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Discussion', 
    required: true 
  },
  reason: { 
    type: String, 
    required: true,
    enum: ['Inappropriate Content', 'Spam', 'Harassment', 'Misinformation', 'Hate Speech', 'Violence', 'Other']
  },
  context: { 
    type: String 
  },
  reporterUsername: { 
    type: String, 
    default: 'Anonymous' 
  },
  // Add user information for the reported content author
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportedUsername: {
    type: String,
    default: 'Anonymous'
  },
  status: { 
    type: String, 
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'removed', 'resolved']
  },
  adminNotes: { 
    type: String 
  },
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin' 
  },
  reviewedAt: { 
    type: Date 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', ReportSchema);
