const express = require('express');
const router = express.Router();
const User = require('../models/User');

const Board = require('../models/Board');
const mongoose = require('mongoose');


// Get available locations (boards + "Others" option)
router.get('/locations', async (req, res) => {
  try {
    const boards = await Board.find({}).select('title');
    const locations = boards.map(board => board.title);
    locations.push('Others'); // Add "Others" as an option
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching locations' });
  }
});

// Public profile view (by ID, phone, or email)

router.get('/profile/:identifier', async (req, res) => {
  const { identifier } = req.params;
  let query = {};

  try {
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      // Handle MongoDB _id
      query = { _id: new mongoose.Types.ObjectId(identifier) };
    } else if (/^\d{5,}$/.test(identifier)) {
      // Handle phone (any number, at least 5 digits to avoid conflict with short IDs)
      query = { phone: identifier };
    } else if (/^\S+@\S+\.\S+$/.test(identifier)) {
      // Handle email
      query = { email: identifier };
    } else {
      return res.status(400).json({ message: 'Invalid identifier format' });
    }

    console.log('Searching user with:', query);

    const user = await User.findOne(query).select(
      'fname lname verificationBadge profession location points'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      name: `${user.fname} ${user.lname}`,
      verificationBadge: user.verificationBadge || false,
      profession: user.profession || 'Not specified',
      location: user.location || 'Unknown',
      points: user.points || 0,
      _id: user._id
    });
  } catch (err) {
    console.error('Public profile fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// ===== Create new user =====
router.post('/', async (req, res) => {
  const { fname, lname, phone, email, address, profession, gender, location } = req.body;

  if (!fname || !lname || !phone) {
    return res.status(400).json({ 
      success: false, 
      message: 'First name, last name, and phone number are required' 
    });
  }

  try {
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Phone number already registered' 
      });
    }

    const newUser = new User({
      fname,
      lname,
      phone,
      email,
      address,
      profession,
      gender,
      location: location || 'Dhanmondi'
    });

    const savedUser = await newUser.save();
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      _id: savedUser._id,
      user: savedUser
    });
  } catch (err) {
    console.error('User creation error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during user creation' 
    });
  }
});

// ===== Get user profile by ID (private route) =====
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

// ===== Upload NID & verification =====
router.patch('/:id/nid', async (req, res) => {
  const userId = req.params.id;
  const { nid, name, dob } = req.body;

  if (!nid) return res.status(400).json({ message: 'NID is required' });

  try {
    const updates = { nid, verificationBadge: true };
    if (name) updates.name = name;
    if (dob) updates.dob = dob;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'NID and user info updated successfully', user });
  } catch (err) {
    console.error('NID update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== Update profile picture =====
router.patch('/:id/profile-pic', async (req, res) => {
  const userId = req.params.id;
  const { profilePic } = req.body;

  if (!profilePic || !profilePic.uri) {
    return res.status(400).json({ success: false, message: 'Profile picture data is required' });
  }

  try {
    const user = await User.findByIdAndUpdate(userId, { profilePic }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'Profile picture updated successfully', user });
  } catch (err) {
    console.error('Profile picture update error:', err);
    res.status(500).json({ success: false, message: 'Server error during profile picture update' });
  }
});

// ===== Update user info =====
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
