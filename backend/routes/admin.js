const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'urbanfix_jwt_secret_key_2024';
    const decoded = jwt.verify(token, jwtSecret);
    const admin = await Admin.findById(decoded.adminId);
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive admin account' });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required',
        error: 'MISSING_CREDENTIALS'
      });
    }

    // Find admin by username
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ 
        message: 'Invalid credentials - Username not found',
        error: 'INVALID_USERNAME'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({ 
        message: 'Account is deactivated',
        error: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Compare password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid credentials - Incorrect password',
        error: 'INVALID_PASSWORD'
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'urbanfix_jwt_secret_key_2024';
    const token = jwt.sign(
      { adminId: admin._id, username: admin.username, role: admin.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      message: 'Server error - Please try again later',
      error: 'SERVER_ERROR'
    });
  }
});

// Get admin profile (protected route)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    res.json({
      message: 'Profile retrieved successfully',
      admin
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comprehensive admin dashboard stats
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // Import required models
    const User = require('../models/User');
    const Discussion = require('../models/Discussion');
    const Ticket = require('../models/Ticket');
    const Announcement = require('../models/Announcement');
    const Report = require('../models/Report');
    const EmergencyReport = require('../models/EmergencyReport');

    // Get current date and calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: thisWeek } });
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: thisMonth } });
    const verifiedUsers = await User.countDocuments({ 'verificationBadge.isVerified': true });
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // Discussion/Post statistics
    const totalPosts = await Discussion.countDocuments();
    const postsToday = await Discussion.countDocuments({ createdAt: { $gte: today } });
    const postsThisWeek = await Discussion.countDocuments({ createdAt: { $gte: thisWeek } });
    const postsThisMonth = await Discussion.countDocuments({ createdAt: { $gte: thisMonth } });
    const activePosts = await Discussion.countDocuments({ status: { $in: ['active', 'approved'] } });
    const pendingPosts = await Discussion.countDocuments({ status: 'pending' });
    const removedPosts = await Discussion.countDocuments({ status: 'removed' });

    // Ticket statistics
    const totalTickets = await Ticket.countDocuments();
    const openTickets = await Ticket.countDocuments({ status: 'open' });
    const resolvedTickets = await Ticket.countDocuments({ status: 'resolved' });
    const ticketsToday = await Ticket.countDocuments({ createdAt: { $gte: today } });
    const ticketsThisWeek = await Ticket.countDocuments({ createdAt: { $gte: thisWeek } });

    // Announcement statistics
    const totalAnnouncements = await Announcement.countDocuments();
    const activeAnnouncements = await Announcement.countDocuments({ isArchived: false });
    const archivedAnnouncements = await Announcement.countDocuments({ isArchived: true });
    const announcementsToday = await Announcement.countDocuments({ createdAt: { $gte: today } });

    // Report statistics
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const resolvedReports = await Report.countDocuments({ status: { $in: ['approved', 'rejected', 'removed'] } });

    // Emergency report statistics
    const totalEmergencyReports = await EmergencyReport.countDocuments();
    const emergencyReportsToday = await EmergencyReport.countDocuments({ createdAt: { $gte: today } });
    const emergencyReportsThisWeek = await EmergencyReport.countDocuments({ createdAt: { $gte: thisWeek } });

    // User engagement metrics
    const topUsers = await User.aggregate([
      { $sort: { 'points.total': -1 } },
      { $limit: 5 },
      { $project: { 
        username: 1,
        phone: 1,
        profilePic: 1,
        'points.total': 1, 
        'stats.postsCreated': 1,
        'stats.commentsAdded': 1
      }}
    ]);

    // Recent activity
    const recentPosts = await Discussion.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title author createdAt status');

    const recentTickets = await Ticket.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('subject status priority createdAt');

    // Growth trends
    const userGrowth = {
      today: newUsersToday,
      thisWeek: newUsersThisWeek,
      thisMonth: newUsersThisMonth,
      total: totalUsers
    };

    const postGrowth = {
      today: postsToday,
      thisWeek: postsThisWeek,
      thisMonth: postsThisMonth,
      total: totalPosts
    };

    const ticketGrowth = {
      today: ticketsToday,
      thisWeek: ticketsThisWeek,
      total: totalTickets
    };

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          banned: bannedUsers,
          growth: userGrowth
        },
        posts: {
          total: totalPosts,
          active: activePosts,
          pending: pendingPosts,
          removed: removedPosts,
          growth: postGrowth
        },
        tickets: {
          total: totalTickets,
          open: openTickets,
          resolved: resolvedTickets,
          growth: ticketGrowth
        },
        announcements: {
          total: totalAnnouncements,
          active: activeAnnouncements,
          archived: archivedAnnouncements,
          today: announcementsToday
        },
        reports: {
          total: totalReports,
          pending: pendingReports,
          resolved: resolvedReports
        },
        emergencyReports: {
          total: totalEmergencyReports,
          today: emergencyReportsToday,
          thisWeek: emergencyReportsThisWeek
        },
        topUsers,
        recentPosts,
        recentTickets
      }
    });

  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard statistics' 
    });
  }
});

// Admin logout (client-side token removal)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

// Get all users (protected route)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', location = '', banStatus = '' } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fname: { $regex: search, $options: 'i' } },
        { lname: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    
    if (banStatus === 'banned') {
      filter.isBanned = true;
    } else if (banStatus === 'unbanned') {
      filter.isBanned = false;
    }
    
    const users = await User.find(filter)
      .select('username email fname lname location isBanned banReason banDate banExpiryDate createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('bannedBy', 'username');
    
    const total = await User.countDocuments(filter);
    
    res.json({
      success: true,
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        usersPerPage: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get specific user details (protected route)
router.get('/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password -otp')
      .populate('bannedBy', 'username email');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user
    });
    
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Ban a user (protected route)
router.post('/users/:userId/ban', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, banType, expiryDate } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Ban reason is required' });
    }
    
    if (banType === 'temporary' && !expiryDate) {
      return res.status(400).json({ success: false, message: 'Expiry date is required for temporary bans' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.isBanned) {
      return res.status(400).json({ success: false, message: 'User is already banned' });
    }
    
    // Set ban details
    user.isBanned = true;
    user.banReason = reason;
    user.banDate = new Date();
    user.bannedBy = req.admin._id;
    
    if (banType === 'temporary') {
      user.banExpiryDate = new Date(expiryDate);
    } else {
      user.banExpiryDate = null; // permanent ban
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: `User ${banType === 'temporary' ? 'temporarily banned' : 'permanently banned'} successfully`,
      user: {
        id: user._id,
        username: user.username,
        isBanned: user.isBanned,
        banReason: user.banReason,
        banDate: user.banDate,
        banExpiryDate: user.banExpiryDate
      }
    });
    
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Unban a user (protected route)
router.post('/users/:userId/unban', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.isBanned) {
      return res.status(400).json({ success: false, message: 'User is not banned' });
    }
    
    // Remove ban details
    user.isBanned = false;
    user.banReason = undefined;
    user.banDate = undefined;
    user.banExpiryDate = undefined;
    user.bannedBy = undefined;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'User unbanned successfully',
      user: {
        id: user._id,
        username: user.username,
        isBanned: user.isBanned
      }
    });
    
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update ban details (protected route)
router.put('/users/:userId/ban', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, banType, expiryDate } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Ban reason is required' });
    }
    
    if (banType === 'temporary' && !expiryDate) {
      return res.status(400).json({ success: false, message: 'Expiry date is required for temporary bans' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.isBanned) {
      return res.status(400).json({ success: false, message: 'User is not banned' });
    }
    
    // Update ban details
    user.banReason = reason;
    user.banDate = new Date();
    user.bannedBy = req.admin._id;
    
    if (banType === 'temporary') {
      user.banExpiryDate = new Date(expiryDate);
    } else {
      user.banExpiryDate = null; // permanent ban
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Ban details updated successfully',
      user: {
        id: user._id,
        username: user.username,
        isBanned: user.isBanned,
        banReason: user.banReason,
        banDate: user.banDate,
        banExpiryDate: user.banExpiryDate
      }
    });
    
  } catch (error) {
    console.error('Update ban error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
