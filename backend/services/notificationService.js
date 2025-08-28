// notificationService.js - Complete version with cleanup methods

const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  
  // Helper function to resolve phone number to username
  static async resolveUserDisplayName(phone) {
    if (!phone || phone === 'Anonymous') return 'Anonymous';
    
    try {
      const user = await User.findOne({ phone });
      if (user) {
        if (user.username) {
          return user.username.trim();
        } else {
          return `User ${user.phone.slice(-4)}`;
        }
      }
      return 'Anonymous';
    } catch (error) {
      console.error('Error resolving username:', error);
      return 'Anonymous';
    }
  }

  static async notifyPostInteraction(recipientPhone, senderPhone, interactionType, postTitle, postId) {
    try {
      console.log('Creating notification:', {
        recipientPhone,
        senderPhone,
        interactionType,
        postTitle
      });

      // CRITICAL FIX: Resolve sender phone to display name
      const senderDisplayName = await this.resolveUserDisplayName(senderPhone);
      
      let title, message;
      
      switch (interactionType) {
        case 'post_liked':
          title = 'New Like';
          message = `${senderDisplayName} liked your post "${postTitle}"`;
          break;
          
        case 'comment_added':
          title = 'New Comment';
          message = `${senderDisplayName} commented on your post "${postTitle}"`;
          break;
          
        case 'poll_voted':
          title = 'New Vote';
          message = `${senderDisplayName} voted on your poll "${postTitle}"`;
          break;
          
        case 'event_rsvp':
          title = 'New RSVP';
          message = `${senderDisplayName} is attending your event "${postTitle}"`;
          break;
          
        case 'volunteer_signup':
          title = 'New Volunteer';
          message = `${senderDisplayName} signed up to volunteer for "${postTitle}"`;
          break;
          
        case 'donation_made':
          title = 'New Donation';
          message = `${senderDisplayName} donated to your campaign "${postTitle}"`;
          break;
          
        case 'help_offered':
          title = 'Help Offered';
          message = `${senderDisplayName} offered to help with "${postTitle}"`;
          break;
          
        default:
          title = 'New Interaction';
          message = `${senderDisplayName} interacted with your post "${postTitle}"`;
      }

      const notification = await Notification.createNotification({
        recipient: recipientPhone, // Keep phone for recipient identification
        sender: senderDisplayName, // FIXED: Use display name instead of phone
        type: interactionType,
        title,
        message,
        relatedPost: postId,
        priority: ['help_offered', 'event_rsvp'].includes(interactionType) ? 'high' : 'normal'
      });

      console.log('Notification created successfully:', notification?.title);
      return notification;
      
    } catch (error) {
      console.error('Error creating post interaction notification:', error);
      return null;
    }
  }

  static async notifyHelpStatusChange(authorPhone, helperPhone, status, postTitle, postId, helperId) {
    try {
      // Resolve author phone to display name
      const authorDisplayName = await this.resolveUserDisplayName(authorPhone);
      
      let title, message;
      
      switch (status) {
        case 'accepted':
          title = 'Help Accepted';
          message = `${authorDisplayName} accepted your help offer for "${postTitle}"`;
          break;
        case 'declined':
          title = 'Help Declined';
          message = `${authorDisplayName} declined your help offer for "${postTitle}"`;
          break;
        case 'completed':
          title = 'Help Completed';
          message = `${authorDisplayName} marked your help as completed for "${postTitle}"`;
          break;
        default:
          title = 'Help Status Update';
          message = `Help status updated for "${postTitle}"`;
      }

      const notification = await Notification.createNotification({
        recipient: helperPhone,
        sender: authorDisplayName, // FIXED: Use display name
        type: 'help_' + status,
        title,
        message,
        relatedPost: postId,
        data: { helperId },
        priority: 'normal'
      });

      return notification;
      
    } catch (error) {
      console.error('Error creating help status notification:', error);
      return null;
    }
  }

  static async notifyAnnouncement(recipientPhone, title, message, announcementId) {
    try {
      const notification = await Notification.createNotification({
        recipient: recipientPhone,
        sender: 'System', // System notifications
        type: 'announcement_posted',
        title,
        message,
        relatedAnnouncement: announcementId,
        priority: 'normal'
      });

      return notification;
      
    } catch (error) {
      console.error('Error creating announcement notification:', error);
      return null;
    }
  }

  static async notifyLeaderboardRank(recipientPhone, rank, period, points) {
    try {
      const notification = await Notification.createNotification({
        recipient: recipientPhone,
        sender: 'System',
        type: 'leaderboard_rank',
        title: 'Leaderboard Update',
        message: `You're now ranked #${rank} on the ${period} leaderboard with ${points} points!`,
        data: { rank, period, points },
        priority: rank <= 10 ? 'high' : 'normal'
      });

      return notification;
      
    } catch (error) {
      console.error('Error creating leaderboard notification:', error);
      return null;
    }
  }

  // Bulk notification method for announcements
  static async notifyAllUsers(title, message, announcementId = null) {
    try {
      const activeUsers = await User.find({ isActive: true }).select('phone');
      
      const notifications = activeUsers.map(user => ({
        recipient: user.phone,
        sender: 'System',
        type: 'announcement_posted',
        title,
        message,
        relatedAnnouncement: announcementId,
        priority: 'normal'
      }));

      const result = await Notification.insertMany(notifications);
      console.log(`Created ${result.length} bulk notifications`);
      
      return result;
      
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      return null;
    }
  }

  /**
   * Clean up old notifications (older than 30 days by default)
   * @param {number} daysOld - Number of days to keep notifications (default: 30)
   */
  static async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate }
      });
      
      console.log(`Cleaned up ${result.deletedCount} old notifications older than ${daysOld} days`);
      return result;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up read notifications older than specified days
   * @param {number} daysOld - Number of days to keep read notifications (default: 7)
   */
  static async cleanupReadNotifications(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await Notification.deleteMany({
        isRead: true,
        createdAt: { $lt: cutoffDate }
      });
      
      console.log(`Cleaned up ${result.deletedCount} read notifications older than ${daysOld} days`);
      return result;
    } catch (error) {
      console.error('Error cleaning up read notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification cleanup statistics
   */
  static async getCleanupStats() {
    try {
      const total = await Notification.countDocuments();
      const read = await Notification.countDocuments({ isRead: true });
      const unread = await Notification.countDocuments({ isRead: false });
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const old = await Notification.countDocuments({
        createdAt: { $lt: thirtyDaysAgo }
      });

      return {
        total,
        read,
        unread,
        oldNotifications: old
      };
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      throw error;
    }
  }

  /**
   * Check for leaderboard changes and notify users
   * @param {string} period - 'daily', 'weekly', or 'monthly'
   */
  static async checkLeaderboardChanges(period = 'weekly') {
    try {
      // This would typically compare current rankings with previous rankings
      // For now, it's a placeholder that could be implemented based on your leaderboard logic
      console.log(`Checking ${period} leaderboard changes...`);
      
      // Example implementation - you would need to implement this based on your leaderboard system
      // const topUsers = await getTopUsers(period, 10);
      // for (const user of topUsers) {
      //   await this.notifyLeaderboardRank(user.phone, user.rank, period, user.points);
      // }
      
      return { success: true, period };
    } catch (error) {
      console.error('Error checking leaderboard changes:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;