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

// Create new discussion
router.post('/', async (req, res) => {
  try {
    const { title, description, type, author, location, image, audio } = req.body;
    
    if (!title || !type || !location) {
      return res.status(400).json({ 
        message: 'Title, type, and location are required' 
      });
    }
    
    const newDiscussion = new Discussion({
      title,
      description,
      type,
      author: author || "Anonymous",
      location,
      image,
      audio
    });
    
    const saved = await newDiscussion.save();
    
    // Check if board exists for this location
    let board = await Board.findOne({ title: location });
    
    if (board) {
      // Board exists, increment post count
      board.posts = (board.posts || 0) + 1;
      await board.save();
    } else {
      // Board doesn't exist, create new one
      board = new Board({
        title: location,
        posts: 1,
        image: null // No default image
      });
      await board.save();
      console.log(`Created new board for location: ${location}`);
    }
    
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error saving discussion:', err);
    res.status(500).json({ message: 'Error saving discussion' });
  }
});

module.exports = router;