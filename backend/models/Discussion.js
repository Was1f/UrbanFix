const mongoose = require('mongoose');

const DiscussionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, required: true },
  author: { type: String, default: "Anonymous" },
  location: { type: String, required: true }, // Add this field
  time: { type: String, default: "Just now" },
  image: { type: String }, // optional
  audio: { type: String }, // optional - was missing from original
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Discussion', DiscussionSchema);