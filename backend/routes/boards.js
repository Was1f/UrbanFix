const express = require('express');
const router = express.Router();
const Board = require('../models/Board');
const Discussion = require('../models/Discussion');

// Get all boards with updated post counts
router.get('/', async (req, res) => {
  try {
    const boards = await Board.find().sort({ title: 1 });
    
    // Update post counts for each board
    for (let board of boards) {
      const discussionCount = await Discussion.countDocuments({ location: board.title });
      if (board.posts !== discussionCount) {
        await Board.findByIdAndUpdate(board._id, { posts: discussionCount });
        board.posts = discussionCount;
      }
    }
    
    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ message: 'Error fetching boards' });
  }
});

// Get a specific board by location
router.get('/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const board = await Board.findOne({ title: location });
    
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    // Update post count
    const discussionCount = await Discussion.countDocuments({ location: board.title });
    if (board.posts !== discussionCount) {
      await Board.findByIdAndUpdate(board._id, { posts: discussionCount });
      board.posts = discussionCount;
    }
    
    res.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ message: 'Error fetching board' });
  }
});

// Create new board (admin function)
router.post('/', async (req, res) => {
  try {
    const { title, area, image } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    const existingBoard = await Board.findOne({ title });
    if (existingBoard) {
      return res.status(400).json({ message: 'Board already exists' });
    }
    
    const newBoard = new Board({
      title,
      area: area || title,
      posts: 0,
      image
    });
    
    const saved = await newBoard.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ message: 'Error creating board' });
  }
});

module.exports = router;