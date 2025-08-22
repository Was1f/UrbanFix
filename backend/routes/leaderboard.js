const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
  try {
    const { period = 'total', limit = 50 } = req.query;
    
    let sortField;
    switch (period) {
      case 'daily': sortField = { 'points.daily': -1 }; break;
      case 'weekly': sortField = { 'points.weekly': -1 }; break;
      case 'monthly': sortField = { 'points.monthly': -1 }; break;
      default: sortField = { 'points.total': -1 };
    }
    
    const users = await User.find({ isActive: true })
      .select('fname lname phone points stats verificationBadge')
      .sort(sortField)
      .limit(parseInt(limit));
    
    const rankedUsers = users.map((user, index) => ({
      ...user.toObject(),
      rank: index + 1
    }));
    
    res.json(rankedUsers);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

module.exports = router;