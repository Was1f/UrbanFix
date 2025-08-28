const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  // Create a notification for post interactions
  static async notifyPostInteraction(postAuthor, interactorUsername, type, postTitle, postId) {
    if (postAuthor === interactorUsername) return; // Don't notify self
    
    const messages = {
      'post_liked': `${interactorUsername} liked your post "${postTitle}"`,
      'comment_added': `${interactorUsername} commented on your post "${postTitle}"`,
      'help_offered': `${interactorUsername} offered to help with your report "${postTitle}"`,
      'poll_voted': `${interactorUsername} voted on your poll "${postTitle}"`,
      'event_rsvp': `${interactorUsername} RSVP'd to your event "${postTitle}"`,
      'volunteer_signup': `${interactorUsername} signed up to volunteer for "${postTitle}"`,
      'donation_made': `${interactorUsername} made a donation to "${postTitle}"`
    };

    const titles = {
      'post_liked': 'Post Liked',
      'comment_added': 'New Comment',
      'help_offered': 'Help Offered',
      'poll_voted': 'New Vote',
      'event_rsvp': 'New RSVP',
      'volunteer_signup': 'New Volunteer',
      'donation_made': 'New Donation'
    };

    if (messages[type] && titles[type]) {
      await Notification.createNotification({
        recipient: postAuthor,
        sender: interactorUsername,
        type,
        title: titles[type],
        message: messages[type],
        relatedPost: postId,
        priority: type === 'help_offered' ? 'high' : 'normal'
      });
    }
  }

  // Create notification for help status changes
  static async notifyHelpStatusChange(postAuthor, helperUsername, status, postTitle, postId, helperId) {
    if (status === 'offered') return; // Already handled by notifyPostInteraction
    
    const messages = {
      'accepted': `Your help offer for "${postTitle}" has been accepted!`,
      'declined': `Your help offer for "${postTitle}" was declined.`,
      'completed': `Your help for "${postTitle}" has been marked as completed. Thank you!`
    };

    const titles = {
      'accepted': 'Help Accepted',
      'declined': 'Help Declined', 
      'completed': 'Help Completed'
    };

    if (messages[status] && titles[status]) {
      await Notification.createNotification({
        recipient: helperUsername,
        sender: postAuthor,
        type: 'help_' + status,
        title: titles[status],
        message: messages[status],
        relatedPost: postId,
        data: { helperId },
        priority: status === 'accepted' ? 'high' : 'normal'
      });
    }
  }

  // Create notification for new announcements
  static async notifyNewAnnouncement(announcementTitle, announcementType, announcementId) {
    try {
      // Get all active users (you might want to add location-based filtering later)
      const activeUsers = await User.find({ 
        isActive: true, 
        isBanned: false 
      }).select('phone username');

      // Create notifications for all users
      const notifications = activeUsers.map(user => ({
        recipient: user.phone, // Using phone as the identifier
        sender: 'UrbanFix Admin',
        type: 'announcement_posted',
        title: 'New Announcement',
        message: `New ${announcementType.toLowerCase()}: ${announcementTitle}`,
        relatedAnnouncement: announcementId,
        priority: announcementType === 'Emergency Alert' ? 'high' : 'normal'
      }));

      // Batch create notifications
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        console.log(`Created ${notifications.length} announcement notifications`);
      }
    } catch (error) {
      console.error('Error creating announcement notifications:', error);
    }
  }

  // Create notification for leaderboard ranking
  static async notifyLeaderboardRank(username, rank, period, totalUsers, points) {
    const rankMessages = {
      1: `Congratulations! You're #1 on the ${period} leaderboard! 🏆`,
      2: `Amazing! You're #2 on the ${period} leaderboard! 🥈`, 
      3: `Great job! You're #3 on the ${period} leaderboard! 🥉`
    };

    let message;
    let title;
    
    if (rank <= 3) {
      message = rankMessages[rank];
      title = `Leaderboard Top ${rank}`;
    } else if (rank <= 10) {
      message = `You're in the top 10 (rank #${rank}) on the ${period} leaderboard!`;
      title = 'Top 10 Ranking';
    } else if (rank <= Math.ceil(totalUsers * 0.25)) { // Top 25%
      message = `You're in the top 25% (rank #${rank}) on the ${period} leaderboard!`;
      title = 'Top 25% Ranking';
    } else {
      return; // Don't notify for lower ranks
    }

    await Notification.createNotification({
      recipient: username,
      sender: 'UrbanFix System',
      type: 'leaderboard_rank',
      title,
      message,
      data: { rank, period, points },
      priority: rank <= 3 ? 'high' : 'normal'
    });
  }

  // Check and notify for leaderboard changes (call this periodically)
  static async checkLeaderboardChanges(period = 'weekly') {
    try {
      const User = require('../models/User');
      
      let sortField;
      switch (period) {
        case 'daily': sortField = { 'points.daily': -1 }; break;
        case 'weekly': sortField = { 'points.weekly': -1 }; break;
        case 'monthly': sortField = { 'points.monthly': -1 }; break;
        default: sortField = { 'points.total': -1 };
      }
      
      const users = await User.find({ isActive: true })
        .select('phone username points')
        .sort(sortField);

      const totalUsers = users.length;
      
      // Notify top performers
      users.forEach(async (user, index) => {
        const rank = index + 1;
        const pointField = period === 'daily' ? user.points.daily : 
                          period === 'weekly' ? user.points.weekly :
                          period === 'monthly' ? user.points.monthly : user.points.total;
        
        if (pointField > 0) { // Only notify users with points
          await this.notifyLeaderboardRank(user.phone, rank, period, totalUsers, pointField);
        }
      });
      
    } catch (error) {
      console.error('Error checking leaderboard changes:', error);
    }
  }

  // Get notification summary for a user
  static async getNotificationSummary(username) {
    try {
      const unreadCount = await Notification.getUnreadCount(username);
      const recentNotifications = await Notification.find({ 
        recipient: username 
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('relatedPost', 'title type')
      .populate('relatedAnnouncement', 'title type');

      return {
        unreadCount,
        recentNotifications
      };
    } catch (error) {
      console.error('Error getting notification summary:', error);
      return { unreadCount: 0, recentNotifications: [] };
    }
  }

  // Clean up old notifications (call this periodically)
  static async cleanupOldNotifications() {
    try {
      await Notification.cleanupOld(30); // Clean notifications older than 30 days
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  }
}

module.exports = NotificationService;