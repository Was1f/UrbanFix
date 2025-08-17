// routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create subdirectories for different file types
    const fileType = file.mimetype.startsWith('image/') ? 'images' : 'audio';
    const typeDir = path.join(uploadsDir, fileType);
    
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed image types
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  // Allowed audio types
  const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg'];
  
  if (imageTypes.includes(file.mimetype) || audioTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and audio files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Single file upload endpoint
router.post('/single', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const fileType = req.file.mimetype.startsWith('image/') ? 'images' : 'audio';
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${fileType}/${req.file.filename}`;

    res.json({
      success: true,
      message: 'File uploaded successfully',
      url: fileUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'File upload failed',
      error: error.message 
    });
  }
});

// Multiple files upload endpoint (if needed)
router.post('/multiple', upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }

    const uploadedFiles = req.files.map(file => {
      const fileType = file.mimetype.startsWith('image/') ? 'images' : 'audio';
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${fileType}/${file.filename}`;
      
      return {
        url: fileUrl,
        fileName: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    });

    res.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Files upload failed',
      error: error.message 
    });
  }
});

// Delete file endpoint
router.delete('/:type/:filename', (req, res) => {
  try {
    const { type, filename } = req.params;
    
    if (!['images', 'audio'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file type' 
      });
    }

    const filePath = path.join(uploadsDir, type, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'File deletion failed',
      error: error.message 
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.',
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files.',
      });
    }
  }
  
  res.status(400).json({
    success: false,
    message: error.message || 'Upload failed',
  });
});

module.exports = router;