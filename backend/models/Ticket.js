const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
    required: true
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['User', 'Admin']
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    uri: { type: String, required: true },
    type: { type: String, default: 'image/jpeg' },
    size: { type: Number, default: 0 },
    filename: { type: String, required: true }
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ticketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'complaint', 'suggestion', 'bug_report', 'other'],
    default: 'general'
  },
  messages: [messageSchema],

  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  resolvedAt: {
    type: Date
  },
  closedAt: {
    type: Date
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Indexes for efficient queries
ticketSchema.index({ user: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1 });

ticketSchema.index({ isArchived: 1, status: 1 });
ticketSchema.index({ createdAt: -1 });

// Virtual for ticket age
ticketSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Method to add message
ticketSchema.methods.addMessage = function(senderId, senderModel, content, attachments = []) {
  this.messages.push({
    sender: senderId,
    senderModel: senderModel,
    content: content,
    attachments: attachments
  });
  return this.save();
};

// Method to update status
ticketSchema.methods.updateStatus = function(newStatus, adminId = null) {
  this.status = newStatus;
  
  if (newStatus === 'resolved') {
    this.resolvedBy = adminId;
    this.resolvedAt = new Date();
  } else if (newStatus === 'closed') {
    this.closedAt = new Date();
  }
  
  return this.save();
};

// Method to archive ticket
ticketSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

module.exports = mongoose.model('Ticket', ticketSchema);
