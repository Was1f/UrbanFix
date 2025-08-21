const mongoose = require('mongoose');



// Comment schema for nested comments
const CommentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: String, default: "Anonymous" },
  createdAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    default: 'active',
    enum: ['active', 'flagged', 'removed']
  }
});

const DiscussionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    required: true,
    enum: ['Report', 'Poll', 'Event', 'Donation', 'Volunteer']
  },
  author: { type: String, default: "Anonymous" },
  location: { type: String, required: true },
  time: { type: String, default: "Just now" },
  image: { type: String },
  audio: { type: String },
  
  // Priority field
  priority: {
    type: String,
    default: 'normal',
    enum: ['low', 'normal', 'medium', 'high', 'urgent']
  },
  
  // Like system
  likes: [{ type: String }], // Array of usernames who liked
  likeCount: { type: Number, default: 0 },
  
  // Poll-specific fields
  pollOptions: [String],
  pollVotes: { type: Map, of: Number }, // { "option1": 5, "option2": 3 }
  pollPrivate: { type: Boolean, default: false },
  userVotes: { type: Map, of: String }, // { "userId": "selectedOption" }
  
  // Event-specific fields
  eventDate: { type: Date },
  eventTime: { type: String },
  attendees: [String], // Array of usernames/IDs
  attendeeCount: { type: Number, default: 0 },
  
  // Donation-specific fields
  goalAmount: { type: Number },
  currentAmount: { type: Number, default: 0 },
  donors: [{
    username: String,
    amount: Number,
    donatedAt: { type: Date, default: Date.now }
  }],
  
  // Volunteer-specific fields
  volunteersNeeded: { type: Number },
  skills: { type: String },
  volunteers: [String], // Array of usernames/IDs
  volunteerCount: { type: Number, default: 0 },
  
  // Comments
  comments: [CommentSchema],
  
  // Moderation fields
  status: { 
    type: String, 
    default: 'active',
    enum: ['active', 'flagged', 'removed', 'pending_review']
  },
  isFlagged: { 
    type: Boolean, 
    default: false 
  },
  flagCount: { 
    type: Number, 
    default: 0 
  },

    helpers: [{
    username: String,
    offeredAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      default: 'offered', 
      enum: ['offered', 'accepted', 'declined', 'completed'] 
    }
  }],
  helperCount: { type: Number, default: 0 },
  helpNeeded: { type: Boolean, default: true }, // Author can mark as resolved
}, {
  timestamps: true
});

// Index for better performance
DiscussionSchema.index({ location: 1, type: 1, priority: 1, createdAt: -1 });
DiscussionSchema.index({ title: 'text', description: 'text' }); // For text search

module.exports = mongoose.model('Discussion', DiscussionSchema);