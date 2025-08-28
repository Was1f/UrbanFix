const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper function to validate username/phone
const isValidUser = async (identifier) => {
  try {
    const user = await User.findOne({ 
      $or: [{ phone: identifier }, { username: identifier }] 
    });
    return !!user;
  } catch (error) {
    return false;
  }
};

// GET /api/notifications - Get notifications for a user
router.get('/', async (req, res) => {
  try {
    const { user, page = 1, limit = 20, unreadOnly = false } = req.query;
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User identifier is required' 
      });
    }

    // Validate user exists
    const userExists = await isValidUser(user);
    if (!userExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = { recipient: user };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('relatedPost', 'title type location')
      .populate('relatedAnnouncement', 'title type');

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(user);

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching notifications' 
    });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', async (req, res) => {
  try {
    const { user } = req.query;
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User identifier is required' 
      });
    }

    const userExists = await isValidUser(user);
    if (!userExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const unreadCount = await Notification.getUnreadCount(user);
    
    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting unread count' 
    });
  }
});

// PUT /api/notifications/mark-read - Mark notifications as read
router.put('/mark-read', async (req, res) => {
  try {
    const { user, notificationIds = [] } = req.body;
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User identifier is required' 
      });
    }

    const userExists = await isValidUser(user);
    if (!userExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const result = await Notification.markAsRead(user, notificationIds);
    
    if (result) {
      const unreadCount = await Notification.getUnreadCount(user);
      res.json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`,
        unreadCount
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to mark notifications as read' 
      });
    }
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking notifications as read' 
    });
  }
});

// PUT /api/notifications/mark-all-read - Mark all notifications as read for user
router.put('/mark-all-read', async (req, res) => {
  try {
    const { user } = req.body;
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User identifier is required' 
      });
    }

    const userExists = await isValidUser(user);
    if (!userExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const result = await Notification.markAsRead(user, []);
    
    if (result) {
      res.json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`,
        unreadCount: 0
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to mark all notifications as read' 
      });
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking all notifications as read' 
    });
  }
});

// DELETE /api/notifications/:id - Delete a specific notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.body;
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User identifier is required' 
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: user
    });

    if (notification) {
      const unreadCount = await Notification.getUnreadCount(user);
      res.json({
        success: true,
        message: 'Notification deleted successfully',
        unreadCount
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting notification' 
    });
  }
});

// POST /api/notifications/test - Create test notification (development only)
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      success: false, 
      message: 'Test endpoint only available in development' 
    });
  }

  try {
    const { recipient, type = 'post_liked' } = req.body;
    
    if (!recipient) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient is required' 
      });
    }

    const notification = await Notification.createNotification({
      recipient,
      sender: 'TestUser',
      type,
      title: 'Test Notification',
      message: 'This is a test notification',
      priority: 'normal'
    });

    if (notification) {
      res.json({
        success: true,
        message: 'Test notification created',
        notification
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create test notification' 
      });
    }
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating test notification' 
    });
  }
});

module.exports = router;