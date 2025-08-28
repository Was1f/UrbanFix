const express = require('express');
const router = express.Router();
const Discussion = require('../models/Discussion');
const Board = require('../models/Board');
const User = require('../models/User');
const mongoose = require('mongoose');
const NotificationService = require('../services/notificationService'); // Add this import

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return id && mongoose.Types.ObjectId.isValid(id) && id !== 'undefined' && id !== 'null';
};

const awardPoints = async (phone, action, location) => {
  const POINTS = {
    POST_CREATED: 10,
    COMMENT_ADDED: 3,
    HELP_OFFERED: 15,
    POST_LIKED: 1,
    POLL_VOTED: 5,
    EVENT_RSVP: 8,
    DONATION_MADE: 10,
    VOLUNTEER_SIGNUP: 12
  };
  
  try {
    const user = await User.findOne({ phone });
    if (!user || !POINTS[action]) return;
    
    const points = POINTS[action];
    const now = new Date();
    
    // Update total points (always accumulates)
    user.points.total += points;
    
    // REMOVED: Don't update daily/weekly/monthly here as they should be calculated from history
    // These fields can be removed or used as cache if needed
    
    // Add to point history for proper time-based filtering
    if (!user.pointHistory) {
      user.pointHistory = [];
    }
    
    user.pointHistory.push({
      date: now,
      points: points,
      action: action,
      location: location,
      details: `${action} in ${location}`
    });
    
    // Optional: Keep only last 365 days of history to prevent database bloat
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    user.pointHistory = user.pointHistory.filter(entry => 
      new Date(entry.date) >= oneYearAgo
    );
    
    // Update stats
    switch(action) {
      case 'POST_CREATED': user.stats.postsCreated++; break;
      case 'COMMENT_ADDED': user.stats.commentsAdded++; break;
      case 'HELP_OFFERED': user.stats.helpOffered++; break;
      case 'POST_LIKED': user.stats.likesGiven++; break;
      case 'POLL_VOTED': user.stats.pollsVoted++; break;
      case 'EVENT_RSVP': user.stats.eventsAttended++; break;
      case 'DONATION_MADE': user.stats.donationsMade++; break;
      case 'VOLUNTEER_SIGNUP': user.stats.volunteered++; break;
    }
    
    await user.save();
    console.log(`Awarded ${points} points to ${phone} for ${action} at ${now}`);
  } catch (error) {
    console.error('Error awarding points:', error);
  }
};


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
    console.error('Error fetching discussions:', error);
    res.status(500).json({ message: 'Error fetching discussions' });
  }
});

// Get specific discussion by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    res.json(discussion);
  } catch (error) {
    console.error('Error fetching discussion:', error);
    res.status(500).json({ message: 'Error fetching discussion' });
  }
});

// Create new discussion
router.post('/', async (req, res) => {
  try {
    const { 
      title, description, type, author, location, image, audio, priority,
      // Poll fields
      pollOptions, pollPrivate,
      // Event fields
      eventDate, eventTime,
      // Donation fields
      goalAmount, currentAmount,
      // Volunteer fields
      volunteersNeeded, skills
    } = req.body;
        // Find the user by phone number to get their name
    let authorName = 'Anonymous';
    let authorProfilePicture = null; 
    if (author && author !== 'Anonymous') {
      try {
        const user = await User.findOne({ phone: author });
        if (user) {
          authorName = `${user.username}`.trim();
          authorProfilePicture = user.profilePic;
        }
      } catch (userError) {
        console.error('Error finding user for author name:', userError);
        authorName = 'Anonymous';
      }
    }

    if (!title || !type || !location) {
      return res.status(400).json({ 
        message: 'Title, type, and location are required' 
      });
    }
    
    let discussionData = {
      title,
      description,
      type,
      author: authorName || "Anonymous",
      authorPhone: author,
      authorProfilePicture,
      location,
      image,
      audio,
      priority: priority || 'normal',
      likes: [],
      likeCount: 0
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

    if (type === 'Report') {
      discussionData.helpers = [];
      discussionData.helperCount = 0;
      discussionData.helpNeeded = true;
    }
    
    const newDiscussion = new Discussion(discussionData);
    const saved = await newDiscussion.save();
    
    // AWARD POINTS FOR CREATING POST
    if (author && author !== "Anonymous") {
      await awardPoints(author, 'POST_CREATED', location);
    }
    
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

// Like/Unlike post
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { username = 'Anonymous' } = req.body;
    
    // Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Initialize likes array if it doesn't exist
    if (!discussion.likes) {
      discussion.likes = [];
    }

    const userIndex = discussion.likes.indexOf(username);
    
    if (userIndex > -1) {
      // User already liked, so unlike
      discussion.likes.splice(userIndex, 1);
    } else {
      // User hasn't liked, so add like and award points
      discussion.likes.push(username);
      
      // AWARD POINTS FOR LIKING
      if (username !== 'Anonymous') {
        await awardPoints(username, 'POST_LIKED', discussion.location);
      }

      // CREATE NOTIFICATION for post author
      if (discussion.author !== username && discussion.author !== 'Anonymous') {
        await NotificationService.notifyPostInteraction(
          discussion.author,
          username,
          'post_liked',
          discussion.title,
          discussion._id
        );
      }
    }
    
    discussion.likeCount = discussion.likes.length;
    await discussion.save();
    
    res.json(discussion);
  } catch (error) {
    console.error('Error liking discussion:', error);
    res.status(500).json({ message: 'Error processing like' });
  }
});

// Vote on poll
router.post('/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { option, previousVote, username = 'Anonymous' } = req.body;
    
    // Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    
    if (!discussion || discussion.type !== 'Poll') {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (!discussion.pollOptions.includes(option)) {
      return res.status(400).json({ message: 'Invalid poll option' });
    }

    // Check if user already voted to avoid double points
    const hasVotedBefore = discussion.userVotes.has(username);

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

    // AWARD POINTS FOR VOTING (only if first time voting)
    if (!hasVotedBefore && username !== 'Anonymous') {
      await awardPoints(username, 'POLL_VOTED', discussion.location);
    }

    // CREATE NOTIFICATION for poll author (only if first vote)
    if (!hasVotedBefore && discussion.author !== username && discussion.author !== 'Anonymous') {
      await NotificationService.notifyPostInteraction(
        discussion.author,
        username,
        'poll_voted',
        discussion.title,
        discussion._id
      );
    }

    res.json(discussion);
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ message: 'Error processing vote' });
  }
});

// RSVP to event or volunteer
router.post('/:id/rsvp', async (req, res) => {
  try {
    const { id } = req.params;
    const { username = 'Anonymous' } = req.body;
    
    // Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    
    if (!discussion || !['Event', 'Volunteer'].includes(discussion.type)) {
      return res.status(404).json({ message: 'Event or volunteer opportunity not found' });
    }

    let alreadySignedUp = false;

    if (discussion.type === 'Event') {
      alreadySignedUp = discussion.attendees.includes(username);
      if (!alreadySignedUp) {
        discussion.attendees.push(username);
        discussion.attendeeCount = discussion.attendees.length;
      }
    } else if (discussion.type === 'Volunteer') {
      alreadySignedUp = discussion.volunteers.includes(username);
      if (!alreadySignedUp) {
        discussion.volunteers.push(username);
        discussion.volunteerCount = discussion.volunteers.length;
      }
    }

    await discussion.save();

    // AWARD POINTS FOR RSVP (only if not already signed up)
    if (!alreadySignedUp && username !== 'Anonymous') {
      const action = discussion.type === 'Event' ? 'EVENT_RSVP' : 'VOLUNTEER_SIGNUP';
      await awardPoints(username, action, discussion.location);
    }

    // CREATE NOTIFICATION for post author (only if new signup)
    if (!alreadySignedUp && discussion.author !== username && discussion.author !== 'Anonymous') {
      const notificationType = discussion.type === 'Event' ? 'event_rsvp' : 'volunteer_signup';
      await NotificationService.notifyPostInteraction(
        discussion.author,
        username,
        notificationType,
        discussion.title,
        discussion._id
      );
    }

    res.json(discussion);
  } catch (error) {
    console.error('Error with RSVP:', error);
    res.status(500).json({ message: 'Error processing RSVP' });
  }
});

// Cancel RSVP
router.post('/:id/cancel-rsvp', async (req, res) => {
  try {
    const { id } = req.params;
    const { username = 'Anonymous' } = req.body;
    
    // Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    
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
    const { id } = req.params;
    const { amount, username = 'Anonymous' } = req.body;
    
    // Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    
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

    // AWARD POINTS FOR DONATION
    if (username !== 'Anonymous') {
      await awardPoints(username, 'DONATION_MADE', discussion.location);
    }

    // CREATE NOTIFICATION for post author
    if (discussion.author !== username && discussion.author !== 'Anonymous') {
      await NotificationService.notifyPostInteraction(
        discussion.author,
        username,
        'donation_made',
        discussion.title,
        discussion._id
      );
    }
    
    res.json(discussion);
  } catch (error) {
    console.error('Error processing donation:', error);
    res.status(500).json({ message: 'Error processing donation' });
  }
});

// Offer help for a report
router.post('/:id/offer-help', async (req, res) => {
  try {
    const { id } = req.params;
    const { username = 'Anonymous' } = req.body;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    
    if (!discussion || discussion.type !== 'Report') {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if user already offered help
    const existingHelper = discussion.helpers.find(h => h.username === username);
    if (existingHelper) {
      return res.status(400).json({ message: 'You already offered to help' });
    }

    // Add helper
    discussion.helpers.push({
      username,
      offeredAt: new Date(),
      status: 'offered'
    });
    
    discussion.helperCount = discussion.helpers.length;
    await discussion.save();

    // AWARD POINTS FOR OFFERING HELP
    if (username !== 'Anonymous') {
      await awardPoints(username, 'HELP_OFFERED', discussion.location);
    }

    // CREATE NOTIFICATION for report author - FIXED
    if (discussion.authorPhone !== username && discussion.authorPhone !== 'Anonymous') {
      await NotificationService.notifyPostInteraction(
        discussion.authorPhone, // Wasif's phone number (recipient)
        username,              // Shadman's phone number (sender)
        'help_offered',
        discussion.title,
        discussion._id
      );
    }

    res.json(discussion);
  } catch (error) {
    console.error('Error offering help:', error);
    res.status(500).json({ message: 'Error offering help' });
  }
});

// Withdraw help offer
router.post('/:id/withdraw-help', async (req, res) => {
  try {
    const { id } = req.params;
    const { username = 'Anonymous' } = req.body;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    
    if (!discussion || discussion.type !== 'Report') {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Remove helper
    discussion.helpers = discussion.helpers.filter(h => h.username !== username);
    discussion.helperCount = discussion.helpers.length;
    await discussion.save();

    res.json(discussion);
  } catch (error) {
    console.error('Error withdrawing help:', error);
    res.status(500).json({ message: 'Error withdrawing help' });
  }
});

// Update helper status (for post author to accept/decline help)
router.patch('/:id/helper/:helperId/status', async (req, res) => {
  try {
    const { id, helperId } = req.params;
    const { status, authorUsername } = req.body;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }

    if (!['offered', 'accepted', 'declined', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const discussion = await Discussion.findById(id);
    
    if (!discussion || discussion.type !== 'Report') {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Only the post author can update helper status
    if (discussion.author !== authorUsername) {
      return res.status(403).json({ message: 'Only the post author can update helper status' });
    }

    const helper = discussion.helpers.find(h => h._id.toString() === helperId);
    if (!helper) {
      return res.status(404).json({ message: 'Helper not found' });
    }

    helper.status = status;
    await discussion.save();

    // CREATE NOTIFICATION for helper about status change
    if (helper.username !== authorUsername && helper.username !== 'Anonymous') {
      await NotificationService.notifyHelpStatusChange(
        authorUsername,
        helper.username,
        status,
        discussion.title,
        discussion._id,
        helperId
      );
    }

    res.json(discussion);
  } catch (error) {
    console.error('Error updating helper status:', error);
    res.status(500).json({ message: 'Error updating helper status' });
  }
});

// Mark report as resolved
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { authorUsername } = req.body;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    
    if (!discussion || discussion.type !== 'Report') {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Only the post author can mark as resolved
    if (discussion.author !== authorUsername) {
      return res.status(403).json({ message: 'Only the post author can mark as resolved' });
    }

    discussion.helpNeeded = false;
    await discussion.save();

    res.json(discussion);
  } catch (error) {
    console.error('Error resolving report:', error);
    res.status(500).json({ message: 'Error resolving report' });
  }
});



router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, author = 'Anonymous' } = req.body;
    
    // Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    // Find the user by phone number to get their name and profile picture
    let authorName = 'Anonymous';
    let authorProfilePicture = null;
    
    if (author && author !== 'Anonymous') {
      try {
        const user = await User.findOne({ phone: author });
        if (user) {
          // CRITICAL FIX: Properly format the display name
          if (user.fname && user.lname) {
            authorName = `${user.fname} ${user.lname}`.trim();
          } else if (user.username) {
            authorName = user.username.trim();
          } else {
            // Fallback to a formatted version of phone
            authorName = `User ${user.phone.slice(-4)}`;
          }
          authorProfilePicture = user.profilePic;
        }
      } catch (userError) {
        console.error('Error finding user for comment author:', userError);
        authorName = 'Anonymous';
      }
    }

    const newComment = {
      content: content.trim(),
      author: authorName, // THIS IS THE KEY FIX - store the display name, not phone
      authorPhone: author, // Store phone separately for backend operations
      authorProfilePicture,
      createdAt: new Date(),
      status: 'active'
    };

    discussion.comments.push(newComment);
    await discussion.save();

    // AWARD POINTS FOR COMMENTING
    if (author !== 'Anonymous') {
      await awardPoints(author, 'COMMENT_ADDED', discussion.location);
    }

    // CREATE NOTIFICATION for post author
    if (discussion.authorPhone !== author && discussion.authorPhone !== 'Anonymous') {
      await NotificationService.notifyPostInteraction(
        discussion.authorPhone,
        author,
        'comment_added',
        discussion.title,
        discussion._id
      );
    }

    // Return the newly added comment
    const addedComment = discussion.comments[discussion.comments.length - 1];
    res.status(201).json(addedComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// Delete discussion (only by author)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { author, authorPhone } = req.body;

    console.log('DELETE request received:', { id, author });
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }
    
    const discussion = await Discussion.findById(id);
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    console.log('Found discussion:', discussion.title);
    console.log('Discussion author:', discussion.author);
    console.log('Request author:', author);

    // Check exact match for author
    if (discussion.authorPhone !== authorPhone) {
      return res.status(403).json({ 
        message: 'You can only delete your own posts',
        discussionAuthor: discussion.author,
        requestAuthor: author
      });
    }

    await Discussion.findByIdAndDelete(id);
    
    // Update board post count
    const board = await Board.findOne({ title: discussion.location });
    if (board && board.posts > 0) {
      board.posts = board.posts - 1;
      await board.save();
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting discussion:', error);
    res.status(500).json({ message: 'Error deleting discussion' });
  }
});

module.exports = router;