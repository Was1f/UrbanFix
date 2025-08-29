// server.js - Serverless-ready for Vercel
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== Import Routes =====
const boardRoutes = require('./routes/boards');
const discussionRoutes = require('./routes/discussions');
const adminRoutes = require('./routes/admin');
const moderationRoutes = require('./routes/moderation');
const uploadRouter = require('./routes/upload');
const emergencyReportRoutes = require('./routes/emergency-reports');
const emergencyContactRoutes = require('./routes/emergency-contacts');
const announcementRoutes = require('./routes/announcements');
const accountRoutes = require('./routes/AccountCreate');
const phoneAuthRoutes = require('./routes/loginAuth');
const userInfoRoutes = require('./routes/UserInfo');
const locationRoutes = require('./routes/locations');
const notificationRoutes = require('./routes/notifications');
const ticketRoutes = require("./routes/tickets");
const fetchPostsRoutes = require("./routes/FetchPosts");

// ===== Use Routes =====
app.use('/api/boards', boardRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/emergency-reports', emergencyReportRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/upload', uploadRouter);
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/account', accountRoutes);
app.use('/api', phoneAuthRoutes);
app.use('/api/user', userInfoRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use("/api/posts", fetchPostsRoutes);
app.use('/api/tickets', ticketRoutes);

// ===== Health check endpoint =====
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ===== Community endpoint for mobile app =====
app.get('/community', (req, res) => {
  res.json({
    message: 'Community endpoint is working',
    available_endpoints: [
      '/api/boards',
      '/api/discussions', 
      '/api/emergency-reports',
      '/api/emergency-contacts',
      '/api/announcements',
      '/api/notifications',
      '/api/admin',
      '/api/moderation',
      '/api/upload'
    ]
  });
});

// ===== Error Handling Middleware =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Maximum size is 50MB.',
      error: 'PAYLOAD_TOO_LARGE'
    });
  }
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ===== MongoDB Connection (serverless-friendly) =====
let cached = global.mongoose;

if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ===== Middleware to connect MongoDB per request =====
app.use(async (req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// ===== Export app for Vercel serverless =====
module.exports = app;
