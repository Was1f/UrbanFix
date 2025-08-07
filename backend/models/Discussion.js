const mongoose = require('mongoose');

const DiscussionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, required: true },
  author: { type: String, default: "Anonymous" },
  time: { type: String, default: "Just now" },
  image: { type: String }, // optional
}, {
  timestamps: true
});

module.exports = mongoose.model('Discussion', DiscussionSchema);
