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
      .populate('reportedUserId', 'fname lname username phone') // Populate user info
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
      .populate('reviewedBy', 'username')
      .populate('reportedUserId', 'fname lname username phone'); // Populate user info

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
        discussion.status = 'approved';
        discussion.isFlagged = false;
        discussion.adminNotes = notes;
        discussion.reviewedBy = req.admin._id;
        discussion.reviewedAt = new Date();
        // Store the original report context for reference
        if (report.context) {
          discussion.reportContext = report.context;
        }
        break;
      case 'rejected':
        discussion.status = 'rejected';
        discussion.isFlagged = false;
        discussion.adminNotes = notes;
        discussion.reviewedBy = req.admin._id;
        discussion.reviewedAt = new Date();
        // Store the original report context for reference
        if (report.context) {
          discussion.reportContext = report.context;
        }
        break;
      case 'removed':
        discussion.status = 'removed';
        discussion.isFlagged = false;
        discussion.adminNotes = notes;
        discussion.reviewedBy = req.admin._id;
        discussion.reviewedAt = new Date();
        // Store the original report context for reference
        if (report.context) {
          discussion.reportContext = report.context;
        }
        break;
      case 'resolved':
        discussion.status = 'active';
        discussion.isFlagged = false;
        discussion.adminNotes = notes;
        discussion.reviewedBy = req.admin._id;
        discussion.reviewedAt = new Date();
        // Store the original report context for reference
        if (report.context) {
          discussion.reportContext = report.context;
        }
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

// Ban user from reported content (ADMIN ONLY)
router.post('/admin/reports/:id/ban-user', authenticateToken, async (req, res) => {
  try {
    const { banReason, banDuration } = req.body; // banDuration: 'temporary' or 'permanent'
    const { id } = req.params;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (!report.reportedUserId) {
      return res.status(400).json({ message: 'No user ID found in this report' });
    }

    // Import User model
    const User = require('../models/User');

    // Find and ban the user
    const user = await User.findById(report.reportedUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set ban details
    user.isBanned = true;
    user.banReason = banReason || 'Violation of community guidelines';
    user.banDate = new Date();
    user.bannedBy = req.admin._id;

    if (banDuration === 'temporary') {
      // Ban for 7 days by default
      user.banExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else {
      // Permanent ban
      user.banExpiryDate = null;
    }

    await user.save();

    // Update report status to resolved
    report.status = 'resolved';
    report.adminNotes = `User banned: ${banReason}`;
    report.reviewedBy = req.admin._id;
    report.reviewedAt = new Date();
    await report.save();

    res.json({
      message: 'User banned successfully',
      user: {
        _id: user._id,
        username: user.username || user.fname,
        isBanned: user.isBanned,
        banReason: user.banReason,
        banExpiryDate: user.banExpiryDate
      },
      report
    });

  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ message: 'Error banning user' });
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
    const { discussionId, reason, context, reporterUsername = 'Anonymous', reportedUserId } = req.body;
    


    if (!discussionId || !reason) {
      return res.status(400).json({ message: 'Discussion ID and reason are required' });
    }

    // Check if discussion exists
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Check if already reported and still pending
    const existingReport = await Report.findOne({ 
      discussionId, 
      status: 'pending'
    });

    // If a pending report exists, treat as idempotent and return OK with the existing report
    if (existingReport) {
      return res.status(200).json({ message: 'Report already pending review', report: existingReport });
    }

    // Create new report with user information
    const report = new Report({
      discussionId,
      reason,
      context, // Add the context field
      reporterUsername,
      reportedUserId: reportedUserId || null, // Add user ID if provided
      reportedUsername: discussion.author || 'Anonymous' // Use discussion author as reported username
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

// Check if a discussion has a pending report (PUBLIC ROUTE)
router.get('/user/report/check', async (req, res) => {
  try {
    const { discussionId } = req.query;

    if (!discussionId) {
      return res.status(400).json({ message: 'Discussion ID is required' });
    }

    const pendingReport = await Report.findOne({ discussionId, status: 'pending' });
    const hasPendingReport = !!pendingReport;

    res.json({ hasPendingReport });
  } catch (error) {
    console.error('Error checking report status:', error);
    res.status(500).json({ message: 'Error checking report status' });
  }
});

// Revoke a pending report for a discussion (PUBLIC ROUTE)
router.post('/user/report/revoke', async (req, res) => {
  try {
    const { discussionId } = req.body;

    if (!discussionId) {
      return res.status(400).json({ message: 'Discussion ID is required' });
    }

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const pendingReport = await Report.findOne({ discussionId, status: 'pending' });

    if (!pendingReport) {
      return res.status(404).json({ message: 'No pending report to revoke' });
    }

    // Delete the pending report
    await Report.deleteOne({ _id: pendingReport._id });

    // Update discussion flags
    const newFlagCount = Math.max(0, (discussion.flagCount || 0) - 1);
    discussion.flagCount = newFlagCount;
    if (newFlagCount === 0) {
      discussion.isFlagged = false;
      if (discussion.status === 'flagged') {
        discussion.status = 'active';
      }
    }
    await discussion.save();

    return res.status(200).json({ message: 'Report revoked successfully' });
  } catch (error) {
    console.error('Error revoking report:', error);
    res.status(500).json({ message: 'Error revoking report' });
  }
});

module.exports = router;
