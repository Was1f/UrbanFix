const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get user profile by ID
router.get('/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId).select('-__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload NID & verification
router.patch('/:id/nid', async (req, res) => {
  const userId = req.params.id;
  const { nid } = req.body;
  if (!nid) return res.status(400).json({ message: 'NID is required' });

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { nid, verificationBadge: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'NID uploaded successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user info
router.put('/:id', async (req, res) => {
  const userId = req.params.id;
  const updates = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
