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
    res.json({
      admin: {
        id: req.admin._id,
        username: req.admin.username,
        email: req.admin.email,
        role: req.admin.role
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
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
