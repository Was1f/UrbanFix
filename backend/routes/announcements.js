const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const NotificationService = require('../services/notificationService'); // Add this import

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads/announcements');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'announcement-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware to check admin authentication (matching existing admin.js auth system)
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const jwt = require('jsonwebtoken');
    const Admin = require('../models/Admin');
    const jwtSecret = process.env.JWT_SECRET || 'urbanfix_jwt_secret_key_2024';
    const decoded = jwt.verify(token, jwtSecret);
    
    const admin = await Admin.findById(decoded.adminId);
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive admin account' });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Archive expired announcements (run this periodically)
const archiveExpiredAnnouncements = async () => {
  try {
    await Announcement.archiveExpired();
  } catch (error) {
    console.error('Error archiving expired announcements:', error);
  }
};

// GET /api/announcements - Get active announcements for users
router.get('/', async (req, res) => {
  try {
    // Archive expired announcements before fetching
    await archiveExpiredAnnouncements();

    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const search = req.query.search;
    
    let query = { 
      isActive: true, 
      expirationDate: { $gt: new Date() } 
    };

    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { customType: { $regex: search, $options: 'i' } }
      ];
    }

    const announcementsQuery = Announcement.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username email');
    
    if (limit) {
      announcementsQuery.limit(limit);
    }

    const announcements = await announcementsQuery;
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
});

// GET /api/announcements/latest - Get latest announcement for dashboard card
router.get('/latest', async (req, res) => {
  try {
    await archiveExpiredAnnouncements();
    
    const announcement = await Announcement.findOne({ 
      isActive: true, 
      expirationDate: { $gt: new Date() } 
    })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'username email');

    res.json(announcement);
  } catch (error) {
    console.error('Error fetching latest announcement:', error);
    res.status(500).json({ message: 'Error fetching latest announcement' });
  }
});

// Admin routes - require authentication
// GET /api/announcements/admin - Get all announcements for admin
router.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    await archiveExpiredAnnouncements();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const status = req.query.status; // 'active', 'archived', 'all'

    let query = {};

    // Filter by status
    if (status === 'active') {
      query = { isActive: true, isArchived: false };
    } else if (status === 'archived') {
      query = { isArchived: true };
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { customType: { $regex: search, $options: 'i' } }
      ];
    }

    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username email');

    const total = await Announcement.countDocuments(query);

    res.json({
      announcements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin announcements:', error);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
});

// GET /api/announcements/admin/archived - Get archived announcements
router.get('/admin/archived', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const announcements = await Announcement.find({ isArchived: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username email');

    const total = await Announcement.countDocuments({ isArchived: true });

    res.json({
      announcements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching archived announcements:', error);
    res.status(500).json({ message: 'Error fetching archived announcements' });
  }
});

// POST /api/announcements/admin - Create new announcement
router.post('/admin', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      customType,
      time,
      expirationDate,
      imageBase64,
      imageFileName
    } = req.body;

    let imagePath = null;

    // Handle base64 image (for cross-device uploads)
    if (imageBase64 && imageFileName) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `announcement-${Date.now()}-${imageFileName}`;
        const filepath = path.join(__dirname, '../uploads/announcements', filename);
        
        // Ensure uploads directory exists
        const uploadsDir = path.dirname(filepath);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, buffer);
        imagePath = `/uploads/announcements/${filename}`;
      } catch (imageError) {
        console.error('Failed to process base64 image:', imageError);
      }
    }
    // Handle regular file upload
    else if (req.file) {
      imagePath = `/uploads/announcements/${req.file.filename}`;
    }

    const announcementData = {
      title: title?.trim(),
      description: description?.trim(),
      type: type || 'Other',
      customType: customType?.trim(),
      time: time?.trim(),
      expirationDate: new Date(expirationDate),
      createdBy: req.admin._id,
      image: imagePath
    };

    const announcement = new Announcement(announcementData);
    await announcement.save();
    
    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('createdBy', 'username email');

    // CREATE NOTIFICATIONS for all users about the new announcement
    console.log('Creating notifications for new announcement...');
    await NotificationService.notifyAllUsers(
      `New ${announcement.customType || announcement.type} Announcement`,
      announcement.title,
      announcement._id
    );

    res.status(201).json(populatedAnnouncement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Error creating announcement', error: error.message });
  }
});

// PUT /api/announcements/admin/:id - Update announcement
router.put('/admin/:id', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      type,
      customType,
      time,
      expirationDate,
      imageBase64,
      imageFileName
    } = req.body;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Update fields
    announcement.title = title?.trim() || announcement.title;
    announcement.description = description?.trim() || announcement.description;
    announcement.type = type || announcement.type;
    announcement.customType = customType?.trim();
    announcement.time = time?.trim();
    announcement.expirationDate = expirationDate ? new Date(expirationDate) : announcement.expirationDate;

    // Handle image update
    if (imageBase64 && imageFileName) {
      // Handle base64 image (for cross-device uploads)
      try {
        // Delete old image if exists
        if (announcement.image) {
          const oldImagePath = path.join(__dirname, '..', announcement.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }

        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `announcement-edit-${Date.now()}-${imageFileName}`;
        const filepath = path.join(__dirname, '../uploads/announcements', filename);
        
        // Ensure uploads directory exists
        const uploadsDir = path.dirname(filepath);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, buffer);
        announcement.image = `/uploads/announcements/${filename}`;
      } catch (imageError) {
        console.error('Failed to process base64 image for update:', imageError);
      }
    }
    // Handle regular file upload
    else if (req.file) {
      // Delete old image if exists
      if (announcement.image) {
        const oldImagePath = path.join(__dirname, '..', announcement.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      announcement.image = `/uploads/announcements/${req.file.filename}`;
    }

    await announcement.save();
    
    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('createdBy', 'username email');

    res.json(populatedAnnouncement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: 'Error updating announcement', error: error.message });
  }
});

// DELETE /api/announcements/admin/:id - Delete announcement
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Delete associated image if exists
    if (announcement.image) {
      const imagePath = path.join(__dirname, '..', announcement.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Announcement.findByIdAndDelete(id);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'Error deleting announcement' });
  }
});

// POST /api/announcements/admin/:id/archive - Archive announcement
router.post('/admin/:id/archive', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { 
        isActive: false, 
        isArchived: true,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('createdBy', 'username email');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Error archiving announcement:', error);
    res.status(500).json({ message: 'Error archiving announcement' });
  }
});

// POST /api/announcements/admin/:id/restore - Restore archived announcement
router.post('/admin/:id/restore', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { 
        isActive: true, 
        isArchived: false,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('createdBy', 'username email');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Error restoring announcement:', error);
    res.status(500).json({ message: 'Error restoring announcement' });
  }
});

module.exports = router;