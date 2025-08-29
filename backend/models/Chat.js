const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: { expires: '48h' } } // auto-delete after 48h
});

// TTL index ensures auto-deletion after 48 hours
chatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 48 * 3600 });

module.exports = mongoose.model('Chat', chatSchema);
