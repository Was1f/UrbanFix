const express = require('express');
const router = express.Router();
const Discussion = require('../models/Discussion');
const Board = require('../models/Board');

// Get all discussions or filter by location
router.get('/', async (req, res) => {
  try {
    const { location } = req.query;
    let query = {};
    
    if (location) {
      query.location = location;
    }
    
    const discussions = await Discussion.find(query).sort({ createdAt: -1 });
    res.json(discussions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching discussions' });
  }
});

// Get specific discussion by ID
router.get('/:id', async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    res.json(discussion);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching discussion' });
  }
});

// Create new discussion
router.post('/', async (req, res) => {
  try {
    const { 
      title, description, type, author, location, image, audio,
      // Poll fields
      pollOptions, pollPrivate,
      // Event fields
      eventDate, eventTime,
      // Donation fields
      goalAmount, currentAmount,
      // Volunteer fields
      volunteersNeeded, skills
    } = req.body;
    
    if (!title || !type || !location) {
      return res.status(400).json({ 
        message: 'Title, type, and location are required' 
      });
    }
    
    let discussionData = {
      title,
      description,
      type,
      author: author || "Anonymous",
      location,
      image,
      audio
    };

    // Add type-specific fields
    if (type === 'Poll' && pollOptions) {
      discussionData.pollOptions = pollOptions;
      discussionData.pollPrivate = pollPrivate || false;
      discussionData.pollVotes = new Map();
      pollOptions.forEach(option => {
        discussionData.pollVotes.set(option, 0);
      });
      discussionData.userVotes = new Map();
    }

    if (type === 'Event') {
      discussionData.eventDate = eventDate;
      discussionData.eventTime = eventTime;
      discussionData.attendees = [];
      discussionData.attendeeCount = 0;
    }

    if (type === 'Donation') {
      discussionData.goalAmount = goalAmount;
      discussionData.currentAmount = currentAmount || 0;
      discussionData.donors = [];
    }

    if (type === 'Volunteer') {
      discussionData.volunteersNeeded = volunteersNeeded;
      discussionData.skills = skills;
      discussionData.volunteers = [];
      discussionData.volunteerCount = 0;
    }
    
    const newDiscussion = new Discussion(discussionData);
    const saved = await newDiscussion.save();
    
    // Update board post count
    let board = await Board.findOne({ title: location });
    if (board) {
      board.posts = (board.posts || 0) + 1;
      await board.save();
    } else {
      board = new Board({
        title: location,
        posts: 1,
        image: null
      });
      await board.save();
    }
    
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error saving discussion:', err);
    res.status(500).json({ message: 'Error saving discussion' });
  }
});

// Vote on poll
router.post('/:id/vote', async (req, res) => {
  try {
    const { option, previousVote, username = 'Anonymous' } = req.body;
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion || discussion.type !== 'Poll') {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (!discussion.pollOptions.includes(option)) {
      return res.status(400).json({ message: 'Invalid poll option' });
    }

    // Remove previous vote if exists
    if (previousVote && discussion.pollOptions.includes(previousVote)) {
      const prevCount = discussion.pollVotes.get(previousVote) || 0;
      discussion.pollVotes.set(previousVote, Math.max(0, prevCount - 1));
    }

    // Add new vote
    const currentCount = discussion.pollVotes.get(option) || 0;
    discussion.pollVotes.set(option, currentCount + 1);
    discussion.userVotes.set(username, option);

    await discussion.save();
    res.json(discussion);
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ message: 'Error processing vote' });
  }
});

// RSVP to event or volunteer
router.post('/:id/rsvp', async (req, res) => {
  try {
    const { username = 'Anonymous' } = req.body;
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion || !['Event', 'Volunteer'].includes(discussion.type)) {
      return res.status(404).json({ message: 'Event or volunteer opportunity not found' });
    }

    if (discussion.type === 'Event') {
      if (!discussion.attendees.includes(username)) {
        discussion.attendees.push(username);
        discussion.attendeeCount = discussion.attendees.length;
      }
    } else if (discussion.type === 'Volunteer') {
      if (!discussion.volunteers.includes(username)) {
        discussion.volunteers.push(username);
        discussion.volunteerCount = discussion.volunteers.length;
      }
    }

    await discussion.save();
    res.json(discussion);
  } catch (error) {
    console.error('Error with RSVP:', error);
    res.status(500).json({ message: 'Error processing RSVP' });
  }
});

// Cancel RSVP
router.post('/:id/cancel-rsvp', async (req, res) => {
  try {
    const { username = 'Anonymous' } = req.body;
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion || !['Event', 'Volunteer'].includes(discussion.type)) {
      return res.status(404).json({ message: 'Event or volunteer opportunity not found' });
    }

    if (discussion.type === 'Event') {
      discussion.attendees = discussion.attendees.filter(att => att !== username);
      discussion.attendeeCount = discussion.attendees.length;
    } else if (discussion.type === 'Volunteer') {
      discussion.volunteers = discussion.volunteers.filter(vol => vol !== username);
      discussion.volunteerCount = discussion.volunteers.length;
    }

    await discussion.save();
    res.json(discussion);
  } catch (error) {
    console.error('Error canceling RSVP:', error);
    res.status(500).json({ message: 'Error canceling RSVP' });
  }
});

// Make donation
router.post('/:id/donate', async (req, res) => {
  try {
    const { amount, username = 'Anonymous' } = req.body;
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion || discussion.type !== 'Donation') {
      return res.status(404).json({ message: 'Donation campaign not found' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid donation amount' });
    }

    discussion.donors.push({
      username,
      amount: parseFloat(amount),
      donatedAt: new Date()
    });

    discussion.currentAmount = (discussion.currentAmount || 0) + parseFloat(amount);
    
    await discussion.save();
    res.json(discussion);
  } catch (error) {
    console.error('Error processing donation:', error);
    res.status(500).json({ message: 'Error processing donation' });
  }
});

// Add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { content, author = 'Anonymous' } = req.body;
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const newComment = {
      content: content.trim(),
      author,
      createdAt: new Date(),
      status: 'active'
    };

    discussion.comments.push(newComment);
    await discussion.save();

    // Return the newly added comment
    const addedComment = discussion.comments[discussion.comments.length - 1];
    res.status(201).json(addedComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// Get comments for a discussion
router.get('/:id/comments', async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Filter out removed comments
    const activeComments = discussion.comments.filter(comment => comment.status === 'active');
    res.json(activeComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Update comment status (for moderation)
router.patch('/:discussionId/comments/:commentId', async (req, res) => {
  try {
    const { discussionId, commentId } = req.params;
    const { status } = req.body;

    if (!['active', 'flagged', 'removed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const comment = discussion.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.status = status;
    await discussion.save();

    res.json({ message: 'Comment status updated', comment });
  } catch (error) {
    console.error('Error updating comment status:', error);
    res.status(500).json({ message: 'Error updating comment status' });
  }
});

module.exports = router;