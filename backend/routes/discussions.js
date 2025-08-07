const express = require('express');
const router = express.Router();
const Discussion = require('../models/Discussion');

router.get('/', async (req, res) => {
  try {
    const discussions = await Discussion.find();
    res.json(discussions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching discussions' });
  }
});

router.post('/', async (req, res) => {
  try {
    const newDiscussion = new Discussion(req.body);
    const saved = await newDiscussion.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Error saving discussion' });
  }
});

module.exports = router;