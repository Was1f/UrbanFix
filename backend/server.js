// server.js - Updated configuration
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const os = require('os');
const path = require('path');
require('dotenv').config();


dotenv.config();

const app = express();

// ===== Middleware =====
app.use(cors());

// Increase payload size limits for media uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use

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
      '/api/admin',
      '/api/moderation',
      '/api/upload'
    ]
  });
});

// ===== Error Handling Middleware =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle specific error types
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

// ===== Helper for LAN IP =====
function getLocalExternalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName of Object.keys(interfaces)) {
    for (const net of interfaces[interfaceName] || []) {
      if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

// ===== MongoDB Connection =====
const PORT = process.env.PORT || 5000;

mongoose.connect(
  process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/community-app',
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => {
  console.log('MongoDB Connected');

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server accessible at:`);
    console.log(`  - Local: http://localhost:${PORT}`);
    const lanIp = getLocalExternalIPv4();
    if (lanIp) {
      console.log(`  - Network: http://${lanIp}:${PORT}`);
    }
    console.log(`  - Uploads directory: ${path.join(__dirname, 'uploads')}`);
  });
})
.catch(err => console.error('MongoDB connection error:', err));

module.exports = app;