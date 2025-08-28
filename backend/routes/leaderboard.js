// CORRECTED: leaderboard.js - Proper time-based filtering

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Helper function to get date ranges
const getDateRange = (period) => {
  const now = new Date();
  
  switch (period) {
    case 'daily':
      // Start of today
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: startOfToday, end: new Date() };
    
    case 'weekly':
      // Start of this week (Monday)
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      return { start: startOfWeek, end: new Date() };
    
    case 'monthly':
      // Start of this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth, end: new Date() };
    
    default:
      return null; // For 'total', we don't filter by date
  }
};

// Main leaderboard endpoint - CORRECTED
router.get('/', async (req, res) => {
  try {
    const { period = 'total', limit = 50 } = req.query;
    
    if (period === 'total') {
      // For total points, use the stored total
      const users = await User.find({ isActive: true })
        .select('fname lname username phone points stats verificationBadge')
        .sort({ 'points.total': -1 })
        .limit(parseInt(limit));
      
      const rankedUsers = users.map((user, index) => ({
        ...user.toObject(),
        rank: index + 1,
        periodPoints: user.points.total || 0
      }));
      
      return res.json(rankedUsers);
    }

    // For time-based periods, we need to calculate from point history
    const { start, end } = getDateRange(period);
    
    // Get all active users
    const users = await User.find({ isActive: true })
      .select('fname lname username phone points stats verificationBadge pointHistory');
    
    // Calculate points for each user in the specified period
    const usersWithPeriodPoints = users.map(user => {
      let periodPoints = 0;
      
      // If user has pointHistory, calculate from that
      if (user.pointHistory && Array.isArray(user.pointHistory)) {
        periodPoints = user.pointHistory
          .filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= start && entryDate <= end;
          })
          .reduce((sum, entry) => sum + (entry.points || 0), 0);
      } else {
        // Fallback: if no pointHistory, use stored values (less accurate)
        switch (period) {
          case 'daily':
            periodPoints = user.points?.daily || 0;
            break;
          case 'weekly':
            periodPoints = user.points?.weekly || 0;
            break;
          case 'monthly':
            periodPoints = user.points?.monthly || 0;
            break;
        }
      }
      
      return {
        ...user.toObject(),
        periodPoints
      };
    });
    
    // Sort by period points and add ranking
    const rankedUsers = usersWithPeriodPoints
      .sort((a, b) => b.periodPoints - a.periodPoints)
      .slice(0, parseInt(limit))
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }));
    
    res.json(rankedUsers);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

// Individual user stats endpoint - CORRECTED
router.get('/user/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { period = 'total' } = req.query;
    
    const user = await User.findOne({ phone, isActive: true })
      .select('fname lname username phone points stats verificationBadge pointHistory');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let userPeriodPoints = 0;
    
    if (period === 'total') {
      userPeriodPoints = user.points?.total || 0;
    } else {
      const { start, end } = getDateRange(period);
      
      // Calculate user's points for the period
      if (user.pointHistory && Array.isArray(user.pointHistory)) {
        userPeriodPoints = user.pointHistory
          .filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= start && entryDate <= end;
          })
          .reduce((sum, entry) => sum + (entry.points || 0), 0);
      } else {
        // Fallback
        switch (period) {
          case 'daily':
            userPeriodPoints = user.points?.daily || 0;
            break;
          case 'weekly':
            userPeriodPoints = user.points?.weekly || 0;
            break;
          case 'monthly':
            userPeriodPoints = user.points?.monthly || 0;
            break;
        }
      }
    }

    // Calculate rank by counting users with higher points in the same period
    let rank = 1;
    const totalParticipants = await User.countDocuments({ isActive: true });
    
    if (period === 'total') {
      const usersWithHigherPoints = await User.countDocuments({ 
        'points.total': { $gt: userPeriodPoints }, 
        isActive: true 
      });
      rank = usersWithHigherPoints + 1;
    } else {
      // For time periods, we need to check all users
      const { start, end } = getDateRange(period);
      const allUsers = await User.find({ isActive: true })
        .select('pointHistory points');
      
      let usersWithHigherPoints = 0;
      
      allUsers.forEach(otherUser => {
        let otherUserPeriodPoints = 0;
        
        if (otherUser.pointHistory && Array.isArray(otherUser.pointHistory)) {
          otherUserPeriodPoints = otherUser.pointHistory
            .filter(entry => {
              const entryDate = new Date(entry.date);
              return entryDate >= start && entryDate <= end;
            })
            .reduce((sum, entry) => sum + (entry.points || 0), 0);
        } else {
          // Fallback
          switch (period) {
            case 'daily':
              otherUserPeriodPoints = otherUser.points?.daily || 0;
              break;
            case 'weekly':
              otherUserPeriodPoints = otherUser.points?.weekly || 0;
              break;
            case 'monthly':
              otherUserPeriodPoints = otherUser.points?.monthly || 0;
              break;
          }
        }
        
        if (otherUserPeriodPoints > userPeriodPoints) {
          usersWithHigherPoints++;
        }
      });
      
      rank = usersWithHigherPoints + 1;
    }

    // Format user name
    let userName = 'Anonymous';
    if (user.fname && user.lname) {
      userName = `${user.fname} ${user.lname}`.trim();
    } else if (user.username) {
      userName = user.username;
    } else {
      userName = `User ${user.phone.slice(-4)}`;
    }

    const response = {
      user: {
        name: userName,
        phone: user.phone,
        points: {
          ...user.points,
          [period]: userPeriodPoints // Add the calculated period points
        },
        stats: user.stats,
        verificationBadge: user.verificationBadge
      },
      rank,
      totalParticipants
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Error fetching user stats' });
  }
});

module.exports = router;