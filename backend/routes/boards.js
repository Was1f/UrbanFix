const express = require('express');
const router = express.Router();
const Board = require('../models/Board');

// Get all boards, sorted by post count (most active first)
router.get('/', async (req, res) => {
  try {
    const boards = await Board.find().sort({ posts: -1, title: 1 });
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
    
    res.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ message: 'Error fetching board' });
  }
});

module.exports = router;