const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Admin = require('../models/Admin');

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

module.exports = router;
