// unused

const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 50 },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  currentAction: {
    type: String,
    enum: ['unresolved', 'under work', 'failed', 'resolved'],
    default: 'unresolved'
  }
});

module.exports = mongoose.model('Report', reportSchema);
