const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 50 },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  comments: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  repostCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Post', postSchema);
