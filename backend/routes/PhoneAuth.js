const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Check if phone exists
router.post('/check-phone', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'Phone number not registered' });
    return res.json({ success: true, message: 'Phone exists' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user by phone
router.post('/get-user-by-phone', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone is required' });

  try {
    const user = await User.findOne({ phone }).select('-__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
