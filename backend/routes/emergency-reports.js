const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const EmergencyReport = require('../models/EmergencyReport');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wav|mp3|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, video, and audio files are allowed!'));
    }
  }
});

// Get all emergency reports
router.get('/', async (req, res) => {
  try {
    const reports = await EmergencyReport.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new emergency report with file uploads
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const attachments = [];
    
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 
                        file.mimetype.startsWith('video/') ? 'video' : 'audio';
        
        attachments.push({
          type: fileType,
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: `/uploads/${file.filename}`
        });
      });
    }

    const report = new EmergencyReport({
      category: req.body.category,
      description: req.body.description,
      location: req.body.location,
      coordinates: {
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude)
      },
      reporterName: req.body.reporterName || 'Anonymous',
      reporterPhone: req.body.reporterPhone,
      priority: req.body.priority || 'medium',
      urgency: req.body.urgency || 'moderate',
      attachments: attachments
    });

    const newReport = await report.save();
    res.status(201).json(newReport);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a specific emergency report
router.get('/:id', async (req, res) => {
  try {
    const report = await EmergencyReport.findById(req.params.id);
    if (report) {
      res.json(report);
    } else {
      res.status(404).json({ message: 'Report not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update an emergency report
router.patch('/:id', async (req, res) => {
  try {
    const report = await EmergencyReport.findById(req.params.id);
    if (report) {
      Object.keys(req.body).forEach(key => {
        report[key] = req.body[key];
      });
      const updatedReport = await report.save();
      res.json(updatedReport);
    } else {
      res.status(404).json({ message: 'Report not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an emergency report
router.delete('/:id', async (req, res) => {
  try {
    const report = await EmergencyReport.findById(req.params.id);
    if (report) {
      // Delete associated files
      if (report.attachments && report.attachments.length > 0) {
        report.attachments.forEach(attachment => {
          const filePath = path.join(__dirname, '..', attachment.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
      
      await EmergencyReport.findByIdAndDelete(req.params.id);
      res.json({ message: 'Report deleted' });
    } else {
      res.status(404).json({ message: 'Report not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
