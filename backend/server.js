const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Models
const User = require('./models/User');
const Post = require('./models/Post');
const Report = require('./models/Report');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(
  'mongodb+srv://urbanfixclient:urbanfixclient@cluster0.h7n2f.mongodb.net/urbanfixdb?retryWrites=true&w=majority&appName=Cluster0',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// ==================== USER ROUTES ====================

// Check if phone exists
app.post('/api/check-phone', async (req, res) => {
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

app.post('/api/get-user-by-phone', async (req, res) => {
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


// Get user profile by ID
app.get('/api/user/:id', async (req, res) => {
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
app.patch('/api/user/:id/nid', async (req, res) => {
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
app.put('/api/user/:id', async (req, res) => {
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

// ==================== POST ROUTES ====================

// Create a post
app.post('/api/posts', async (req, res) => {
  const { userId, title, text } = req.body;
  if (!userId || !title || !text) return res.status(400).json({ message: 'Missing required fields' });

  try {
    const post = new Post({ userId, title, text });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get posts by user
app.get('/api/posts/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== REPORT ROUTES ====================

// Create a report
app.post('/api/reports', async (req, res) => {
  const { userId, title, text } = req.body;
  if (!userId || !title || !text) return res.status(400).json({ message: 'Missing required fields' });

  try {
    const report = new Report({ userId, title, text });
    await report.save();
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reports by user
app.get('/api/reports/:userId', async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== SERVER START ====================
const PORT = 1566;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
