const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Issue = require('../models/Issue');
const User = require('../models/User');

const router = express.Router();

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// @route   POST /api/issues
// @desc    Create a new issue
// @access  Private
router.post('/', [
  auth,
  body('title')
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category')
    .isIn(['pothole', 'streetlight', 'garbage', 'traffic_sign', 'sidewalk', 'drainage', 'tree_maintenance', 'graffiti', 'other'])
    .withMessage('Invalid category'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of 2 numbers'),
  body('location.address')
    .notEmpty()
    .withMessage('Address is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, severity, location, images, tags } = req.body;

    const issue = new Issue({
      title,
      description,
      category,
      severity: severity || 'medium',
      location,
      reporter: req.user._id,
      images: images || [],
      tags: tags || []
    });

    await issue.save();

    // Populate reporter info
    await issue.populate('reporter', 'username fullName');

    res.status(201).json({
      message: 'Issue created successfully',
      issue
    });

  } catch (error) {
    console.error('Issue creation error:', error);
    res.status(500).json({ message: 'Server error during issue creation' });
  }
});

// @route   GET /api/issues
// @desc    Get all issues with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status,
      severity,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      lat,
      lng,
      radius = 10 // km
    } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    // Geospatial query if coordinates provided
    if (lat && lng) {
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const issues = await Issue.find(filter)
      .populate('reporter', 'username fullName')
      .populate('assignedTo', 'username fullName')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Issue.countDocuments(filter);

    res.json({
      issues,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Issues fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/issues/:id
// @desc    Get issue by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reporter', 'username fullName profilePicture')
      .populate('assignedTo', 'username fullName')
      .populate('comments.user', 'username fullName profilePicture')
      .populate('upvotes', 'username')
      .populate('downvotes', 'username');

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    res.json({ issue });
  } catch (error) {
    console.error('Issue fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/issues/:id
// @desc    Update issue
// @access  Private (reporter or admin)
router.put('/:id', [
  auth,
  body('title')
    .optional()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .optional()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('status')
    .optional()
    .isIn(['reported', 'under_review', 'in_progress', 'resolved', 'closed'])
    .withMessage('Invalid status')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Check if user can update (reporter or admin)
    if (issue.reporter.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this issue' });
    }

    const updatedIssue = await Issue.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('reporter', 'username fullName');

    res.json({
      message: 'Issue updated successfully',
      issue: updatedIssue
    });

  } catch (error) {
    console.error('Issue update error:', error);
    res.status(500).json({ message: 'Server error during issue update' });
  }
});

// @route   POST /api/issues/:id/vote
// @desc    Vote on an issue (upvote/downvote)
// @access  Private
router.post('/:id/vote', [
  auth,
  body('voteType')
    .isIn(['upvote', 'downvote'])
    .withMessage('Vote type must be either upvote or downvote')
], async (req, res) => {
  try {
    const { voteType } = req.body;
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const userId = req.user._id;
    const upvoteIndex = issue.upvotes.indexOf(userId);
    const downvoteIndex = issue.downvotes.indexOf(userId);

    if (voteType === 'upvote') {
      if (upvoteIndex > -1) {
        // Remove upvote
        issue.upvotes.splice(upvoteIndex, 1);
      } else {
        // Add upvote, remove downvote if exists
        issue.upvotes.push(userId);
        if (downvoteIndex > -1) {
          issue.downvotes.splice(downvoteIndex, 1);
        }
      }
    } else {
      if (downvoteIndex > -1) {
        // Remove downvote
        issue.downvotes.splice(downvoteIndex, 1);
      } else {
        // Add downvote, remove upvote if exists
        issue.downvotes.push(userId);
        if (upvoteIndex > -1) {
          issue.upvotes.splice(upvoteIndex, 1);
        }
      }
    }

    await issue.save();

    res.json({
      message: 'Vote updated successfully',
      upvotes: issue.upvotes.length,
      downvotes: issue.downvotes.length,
      voteCount: issue.voteCount
    });

  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Server error during voting' });
  }
});

// @route   POST /api/issues/:id/comments
// @desc    Add comment to issue
// @access  Private
router.post('/:id/comments', [
  auth,
  body('text')
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const comment = {
      user: req.user._id,
      text: req.body.text
    };

    issue.comments.push(comment);
    await issue.save();

    // Populate the new comment
    await issue.populate('comments.user', 'username fullName profilePicture');

    const newComment = issue.comments[issue.comments.length - 1];

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });

  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ message: 'Server error during comment creation' });
  }
});

module.exports = router; 