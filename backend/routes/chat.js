const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Chat = require('../models/chat');
const User = require('../models/User');

// Send a message
router.post('/', async (req, res) => {
  const { senderId, receiver, message } = req.body;

  if (!senderId || !receiver || !message) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Build search conditions
    const conditions = [
      { email: receiver },
      { phone: receiver }
    ];

    if (mongoose.Types.ObjectId.isValid(receiver)) {
      conditions.unshift({ _id: receiver }); // search by _id only if valid ObjectId
    }

    const user = await User.findOne({ $or: conditions });

    if (!user) return res.status(404).json({ message: 'Receiver not found' });

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: 'Invalid senderId' });
    }

    const chat = new Chat({
      senderId,
      receiverId: user._id,
      message
    });

    await chat.save();
    res.json({ success: true, chat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat history by userId, email, or phone
router.get('/:userIdentifier', async (req, res) => {
  const { userIdentifier } = req.params;

  try {
    // Find user first
    const conditions = [
      { email: userIdentifier },
      { phone: userIdentifier }
    ];
    if (mongoose.Types.ObjectId.isValid(userIdentifier)) {
      conditions.unshift({ _id: userIdentifier });
    }

    const user = await User.findOne({ $or: conditions });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const chats = await Chat.find({
      $or: [{ senderId: user._id }, { receiverId: user._id }]
    }).sort({ createdAt: 1 });

    res.json({ success: true, chats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
