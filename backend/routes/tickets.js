const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Middleware to verify user session (no JWT required for users)
const authenticateUser = async (req, res, next) => {
  try {
    // For user endpoints, we'll validate the user ID from the request body or params
    // This matches the pattern used in other user routes in the codebase
    const userId = req.body.userId || req.params.userId || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' });
    }

    const user = await User.findById(userId);
    if (!user || user.isBanned) {
      return res.status(401).json({ message: 'Invalid or banned user' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('User authentication error:', error);
    return res.status(401).json({ message: 'Invalid user' });
  }
};

// Middleware to verify admin JWT token
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Admin access token required' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'urbanfix_jwt_secret_key_2024';
    //console.log('🔍 Verifying JWT token with secret:', jwtSecret ? 'SECRET_SET' : 'USING_FALLBACK');
    
    const decoded = jwt.verify(token, jwtSecret);
    // console.log('🔍 JWT decoded successfully:', { adminId: decoded.adminId, username: decoded.username, role: decoded.role });
    
    const admin = await Admin.findById(decoded.adminId);
    
    if (!admin || !admin.isActive) {
      console.log('❌ Admin not found or inactive:', { adminId: decoded.adminId, adminExists: !!admin, isActive: admin?.isActive });
      return res.status(401).json({ message: 'Invalid or inactive admin' });
    }

    // console.log('✅ Admin authenticated successfully:', { adminId: admin._id, username: admin.username });
    req.admin = admin;
    next();
  } catch (error) {
    console.error('❌ JWT verification error:', error.message);
    if (error.name === 'TokenExpiredError') {
      console.error('❌ Token expired at:', error.expiredAt);
    }
    return res.status(401).json({ message: 'Invalid admin token' });
  }
};

// Create a new ticket (User only)
router.post('/', async (req, res) => {
  try {
    const { userId, subject, description, priority, category, attachments } = req.body;

    if (!userId || !subject || !description) {
      return res.status(400).json({ message: 'User ID, subject and description are required' });
    }

    // Verify user exists and is not banned
    const user = await User.findById(userId);
    if (!user || user.isBanned) {
      return res.status(401).json({ message: 'Invalid or banned user' });
    }

    const ticket = new Ticket({
      user: userId,
      subject,
      description,
      priority: priority || 'medium',
      category: category || 'general',
      messages: [{
        sender: userId,
        senderModel: 'User',
        content: description,
        attachments: attachments || []
      }]
    });

    await ticket.save();

    // Populate user info for response
    await ticket.populate('user', 'fname lname phone email');

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Failed to create ticket' });
  }
});

// Get user's tickets (User only)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, search, sort = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' });
    }

    // Verify user exists and is not banned
    const user = await User.findById(userId);
    if (!user || user.isBanned) {
      return res.status(401).json({ message: 'Invalid or banned user' });
    }
    
    const query = { user: userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const tickets = await Ticket.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user', 'fname lname phone email')
      .populate('resolvedBy', 'username email')
      .populate('messages.sender', 'fname lname username email')
      .lean(); // Use lean() to preserve senderModel in messages

    const total = await Ticket.countDocuments(query);

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
});

// Get specific ticket with messages (User and Admin)
router.get('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { userId } = req.query; // Allow userId as query parameter for users
    const token = req.headers.authorization?.split(' ')[1];
    
    let user = null;
    let admin = null;

    // Check if this is a user request (has userId) or admin request (has token)
    if (token) {
      // Admin request - verify JWT token
      try {
        const jwtSecret = process.env.JWT_SECRET || 'urbanfix_jwt_secret_key_2024';
        const decoded = jwt.verify(token, jwtSecret);
        if (decoded.adminId) {
          admin = await Admin.findById(decoded.adminId);
          if (!admin || !admin.isActive) {
            return res.status(401).json({ message: 'Invalid or inactive admin account' });
          }
        } else if (decoded.userId) {
          user = await User.findById(decoded.userId);
          if (!user || user.isBanned) {
            return res.status(401).json({ message: 'Invalid or banned user' });
          }
        }
      } catch (error) {
        console.error('❌ JWT verification error:', error.message);
        if (error.name === 'TokenExpiredError') {
          console.error('❌ Token expired at:', error.expiredAt);
        }
        return res.status(401).json({ message: 'Invalid admin token' });
      }
    } else if (userId) {
      // User request - verify userId
      user = await User.findById(userId);
      if (!user || user.isBanned) {
        return res.status(401).json({ message: 'Invalid or banned user' });
      }
    } else {
      return res.status(400).json({ message: 'Either access token or user ID is required' });
    }

    const ticket = await Ticket.findById(ticketId)
      .populate('user', 'fname lname phone email')
      .populate('resolvedBy', 'username email')
      .populate('messages.sender', 'fname lname username email')
      .lean(); // Use lean() to get plain objects and preserve senderModel

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check access permissions
    if (user && ticket.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!user && !admin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ message: 'Failed to fetch ticket' });
  }
});

// Add message to ticket (User and Admin)
router.post('/:ticketId/messages', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content, attachments, userId } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    let user = null;
    let admin = null;
    let senderModel = '';

    // Check if this is a user message (no token, has userId) or admin message (has token)
    if (token) {
      // Admin message - use the same authentication logic as other admin routes
      try {
        const jwtSecret = process.env.JWT_SECRET || 'urbanfix_jwt_secret_key_2024';
        const decoded = jwt.verify(token, jwtSecret);
        
        if (decoded.adminId) {
          admin = await Admin.findById(decoded.adminId);
          if (!admin || !admin.isActive) {
            return res.status(401).json({ message: 'Invalid or inactive admin account' });
          }
          senderModel = 'Admin';
        } else if (decoded.userId) {
          user = await User.findById(decoded.userId);
          if (!user || user.isBanned) {
            return res.status(401).json({ message: 'Invalid or banned user' });
          }
          senderModel = 'User';
        }
      } catch (error) {
        console.error('❌ JWT verification error:', error.message);
        if (error.name === 'TokenExpiredError') {
          console.error('❌ Token expired at:', error.expiredAt);
        }
        return res.status(401).json({ message: 'Invalid admin token' });
      }
    } else if (userId) {
      // User message - verify userId
      user = await User.findById(userId);
      if (!user || user.isBanned) {
        return res.status(401).json({ message: 'Invalid or banned user' });
      }
      senderModel = 'User';
    } else {
      return res.status(400).json({ message: 'Either access token or user ID is required' });
    }

    if (!user && !admin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check access permissions
    if (user && ticket.user.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const senderId = user ? user._id : admin._id;
    
    // Update ticket status if admin is responding
    if (admin && ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.addMessage(senderId, senderModel, content, attachments || []);

    // Populate the ticket before sending response to ensure senderModel is preserved
    const populatedTicket = await Ticket.findById(ticketId)
      .populate('user', 'fname lname phone email')
      .populate('resolvedBy', 'username email')
      .populate('messages.sender', 'fname lname username email')
      .lean();

    res.json({
      success: true,
      message: 'Message added successfully',
      ticket: populatedTicket
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ message: 'Failed to add message' });
  }
});

// Admin routes

// Get all tickets for admin (Admin only)
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const { status, priority, category, search, sort = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    

    
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const tickets = await Ticket.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user', 'fname lname phone email')
      .populate('resolvedBy', 'username email')
      .populate('messages.sender', 'fname lname username email')
      .lean(); // Use lean() to preserve senderModel in messages

    const total = await Ticket.countDocuments(query);

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
});

// Get archived tickets (Admin only)
router.get('/admin/archived', authenticateAdmin, async (req, res) => {
  try {
    const { search, user, sort = 'resolvedAt', order = 'desc', page = 1, limit = 20 } = req.query;
    
    const query = { isArchived: true };
    
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (user) {
      const userDoc = await User.findOne({ 
        $or: [
          { fname: { $regex: user, $options: 'i' } },
          { lname: { $regex: user, $options: 'i' } },
          { phone: { $regex: user, $options: 'i' } },
          { email: { $regex: user, $options: 'i' } }
        ]
      });
      if (userDoc) {
        query.user = userDoc._id;
      }
    }

    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const tickets = await Ticket.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user', 'fname lname phone email')
      .populate('resolvedBy', 'username email')
      .populate('messages.sender', 'fname lname username email')
      .lean(); // Use lean() to preserve senderModel in messages

    const total = await Ticket.countDocuments(query);

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching archived tickets:', error);
    res.status(500).json({ message: 'Failed to fetch archived tickets' });
  }
});

// Update ticket status (Admin only)
router.patch('/:ticketId/status', authenticateAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    await ticket.updateStatus(status, req.admin._id);

    // Archive ticket if it's resolved or closed
    if (status === 'resolved' || status === 'closed') {
      await ticket.archive();
    }

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ message: 'Failed to update ticket status' });
  }
});



// Get ticket statistics (Admin only)
router.get('/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const stats = await Ticket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalTickets = await Ticket.countDocuments();
    const archivedTickets = await Ticket.countDocuments({ isArchived: true });
    const openTickets = await Ticket.countDocuments({ status: 'open' });
    const inProgressTickets = await Ticket.countDocuments({ status: 'in_progress' });
    const resolvedTickets = await Ticket.countDocuments({ status: 'resolved' });
    const closedTickets = await Ticket.countDocuments({ status: 'closed' });

    res.json({
      success: true,
      stats: {
        total: totalTickets,
        archived: archivedTickets,
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        closed: closedTickets
      }
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({ message: 'Failed to fetch ticket statistics' });
  }
});

module.exports = router;
