const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (uploaded images and audio)
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    } else if (file.fieldname === 'audio') {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Routes
const boardRoutes = require('./routes/boards');
const discussionRoutes = require('./routes/discussions');
const adminRoutes = require('./routes/admin');
const moderationRoutes = require('./routes/moderation');

app.use('/api/boards', boardRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderation', moderationRoutes);

// File upload endpoint
app.post('/api/upload', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), (req, res) => {
  const files = {};
  
  if (req.files.image) {
    files.image = `http://192.168.56.1:5000/uploads/${req.files.image[0].filename}`;
  }
  
  if (req.files.audio) {
    files.audio = `http://192.168.56.1:5000/uploads/${req.files.audio[0].filename}`;
  }
  
  res.json(files);
});

const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB Connected');
  
  // Initialize default location boards
  const Board = require('./models/Board');
  const defaultLocations = [
    'Dhanmondi', 'Banani', 'Gulshan', 'Mohakhali', 'Uttara', 
    'Mirpur', 'Wari', 'Old Dhaka', 'Tejgaon', 'Ramna'
  ];
  
  for (const location of defaultLocations) {
    const existingBoard = await Board.findOne({ title: location });
    if (!existingBoard) {
      await Board.create({
        title: location,
        area: location, // Using area instead of location to avoid geo conflicts
        posts: 0
      });
      console.log(`Created board for ${location}`);
    }
  }
  
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch(err => console.error(err));