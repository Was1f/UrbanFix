const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Discussion = require('../models/Discussion');
const Admin = require('../models/Admin');

// Middleware to verify JWT token (reuse from admin routes)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const jwt = require('jsonwebtoken');
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

// Get all reports with discussion details (ADMIN ONLY)
router.get('/admin/reports', authenticateToken, async (req, res) => {
  try {
    const { status = 'pending', limit = 20, page = 1 } = req.query;
    
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const reports = await Report.find(query)
      .populate('discussionId', 'title description type author time image status')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasMore: parseInt(page) * parseInt(limit) < total
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Error fetching reports' });
  }
});

// Get single report with full details (ADMIN ONLY)
router.get('/admin/reports/:id', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('discussionId', 'title description type author time image status')
      .populate('reviewedBy', 'username');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: 'Error fetching report' });
  }
});

// Take moderation action on a report (ADMIN ONLY)
router.post('/admin/reports/:id/action', authenticateToken, async (req, res) => {
  try {
    const { action, notes } = req.body;
    const { id } = req.params;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const discussion = await Discussion.findById(report.discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Update report status
    report.status = action;
    report.adminNotes = notes;
    report.reviewedBy = req.admin._id;
    report.reviewedAt = new Date();

    // Update discussion based on action
    switch (action) {
      case 'approved':
        discussion.status = 'active';
        discussion.isFlagged = false;
        break;
      case 'rejected':
        discussion.status = 'active';
        break;
      case 'removed':
        discussion.status = 'removed';
        break;
      case 'resolved':
        discussion.status = 'active';
        discussion.isFlagged = false;
        break;
    }

    await report.save();
    await discussion.save();

    res.json({
      message: `Report ${action} successfully`,
      report,
      discussion
    });

  } catch (error) {
    console.error('Error taking moderation action:', error);
    res.status(500).json({ message: 'Error taking moderation action' });
  }
});

// Get moderation statistics (ADMIN ONLY)
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const flaggedDiscussions = await Discussion.countDocuments({ isFlagged: true });

    res.json({
      totalReports,
      pendingReports,
      flaggedDiscussions,
      statusBreakdown: stats
    });
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    res.status(500).json({ message: 'Error fetching moderation stats' });
  }
});

// Report a discussion (for users - PUBLIC ROUTE)
router.post('/user/report', async (req, res) => {
  try {
    const { discussionId, reason, reporterUsername = 'Anonymous' } = req.body;

    if (!discussionId || !reason) {
      return res.status(400).json({ message: 'Discussion ID and reason are required' });
    }

    // Check if discussion exists
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Check if already reported
    const existingReport = await Report.findOne({ 
      discussionId, 
      status: { $in: ['pending', 'approved'] } 
    });

    if (existingReport) {
      return res.status(400).json({ message: 'Discussion already reported' });
    }

    // Create new report
    const report = new Report({
      discussionId,
      reason,
      reporterUsername
    });

    await report.save();

    // Update discussion flag count
    discussion.flagCount += 1;
    discussion.isFlagged = true;
    discussion.status = 'flagged';
    await discussion.save();

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Error creating report' });
  }
});

module.exports = router;
