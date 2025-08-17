// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const os = require('os');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // to parse JSON bodies

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const boardRoutes = require('./routes/boards');
const discussionRoutes = require('./routes/discussions');
const adminRoutes = require('./routes/admin');
const moderationRoutes = require('./routes/moderation');
const emergencyReportRoutes = require('./routes/emergency-reports');
const emergencyContactRoutes = require('./routes/emergency-contacts');

app.use('/api/boards', boardRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/emergency-reports', emergencyReportRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);

const PORT = process.env.PORT || 5000;

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

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
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
  });
})
.catch(err => console.error(err));
