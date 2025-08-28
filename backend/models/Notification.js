const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { 
    type: String, 
    required: true,
    index: true // For efficient queries by user
  },
  sender: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: [
      'help_offered',
      'help_accepted', 
      'help_declined',
      'comment_added',
      'post_liked',
      'poll_voted',
      'event_rsvp',
      'volunteer_signup',
      'donation_made',
      'announcement_posted',
      'leaderboard_rank',
      'post_mentioned',
      'helper_assigned'
    ],
    required: true 
  },
  relatedPost: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Discussion' 
  },
  relatedAnnouncement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Announcement'
  },
  title: {
    type: String,
    required: true
  },
  message: { 
    type: String, 
    required: true 
  },
  data: {
    // Additional data specific to notification type
    rank: Number,
    period: String,
    points: Number,
    helperId: String
  },
  read: { 
    type: Boolean, 
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1 });

// Static methods for creating different types of notifications
NotificationSchema.statics.createNotification = async function({
  recipient,
  sender,
  type,
  title,
  message,
  relatedPost = null,
  relatedAnnouncement = null,
  data = {},
  priority = 'normal'
}) {
  try {
    const notification = new this({
      recipient,
      sender,
      type,
      title,
      message,
      relatedPost,
      relatedAnnouncement,
      data,
      priority
    });
    
    await notification.save();
    console.log(`Notification created: ${type} for ${recipient}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Method to mark notifications as read
NotificationSchema.statics.markAsRead = async function(recipient, notificationIds = []) {
  try {
    const query = { recipient };
    if (notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    }
    
    const result = await this.updateMany(query, { read: true });
    return result;
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return null;
  }
};

// Method to get unread count
NotificationSchema.statics.getUnreadCount = async function(recipient) {
  try {
    return await this.countDocuments({ recipient, read: false });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Method to clean up old notifications (run periodically)
NotificationSchema.statics.cleanupOld = async function(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await this.deleteMany({
      createdAt: { $lt: cutoffDate },
      read: true
    });
    
    console.log(`Cleaned up ${result.deletedCount} old notifications`);
    return result;
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    return null;
  }
};

module.exports = mongoose.model('Notification', NotificationSchema);