const mongoose = require('mongoose');

const DiscussionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, required: true },
  author: { type: String, default: "Anonymous" },
  time: { type: String, default: "Just now" },
  image: { type: String }, // optional
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

