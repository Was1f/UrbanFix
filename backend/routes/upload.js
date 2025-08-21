const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads');
const communityDir = path.join(uploadDir, 'community');
const appointmentDir = path.join(uploadDir, 'appointment');

[uploadDir, communityDir, appointmentDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for different upload types
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadType = req.body.uploadType || 'community';
    const destDir = uploadType === 'appointment' ? appointmentDir : communityDir;
    cb(null, destDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow only image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Alternative approach: Handle base64 uploads without multer for large data
const handleBase64Upload = async (req, res, directory, urlPath) => {
  try {
    const { imageBase64, imageFileName } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ message: 'No base64 image data provided' });
    }

    const fileName = imageFileName || `upload-${Date.now()}.jpg`;
    
    // Extract base64 data (remove data:image/...;base64, prefix)
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Invalid base64 image data format' });
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ message: 'Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed.' });
    }
    
    // Check base64 data size (approximate file size = base64Length * 0.75)
    const approximateFileSize = base64Data.length * 0.75;
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    
    if (approximateFileSize > maxFileSize) {
      return res.status(400).json({ 
        message: 'Image too large. Maximum size is 10MB.',
        approximateSize: Math.round(approximateFileSize / 1024 / 1024) + 'MB'
      });
    }
    
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const uniqueFileName = `${uuidv4()}-${Date.now()}-${fileName}`;
    const filePath = path.join(directory, uniqueFileName);
    
    // Write file to disk
    fs.writeFileSync(filePath, imageBuffer);
    
    const imageUrl = `${urlPath}/${uniqueFileName}`;
    return res.json({
      success: true,
      imageUrl: imageUrl,
      fileName: uniqueFileName,
      fileSize: imageBuffer.length
    });
    
  } catch (error) {
    console.error('Base64 upload error:', error);
    return res.status(500).json({ 
      message: 'Failed to process base64 image',
      error: error.message 
    });
  }
};

// Community image upload endpoint
router.post('/community', upload.single('image'), async (req, res) => {
  try {
    const {
      imageBase64,
      imageFileName
    } = req.body;

    let imagePath = null;

    // Handle base64 image (for cross-device uploads) - following announcement pattern
    if (imageBase64 && imageFileName) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `community-${Date.now()}-${imageFileName}`;
        const filepath = path.join(communityDir, filename);
        
        // Ensure uploads directory exists
        if (!fs.existsSync(communityDir)) {
          fs.mkdirSync(communityDir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, buffer);
        imagePath = `/uploads/community/${filename}`;
        
        return res.json({
          success: true,
          imageUrl: imagePath,
          fileName: filename
        });
      } catch (imageError) {
        console.error('Failed to process base64 image:', imageError);
        return res.status(500).json({ 
          message: 'Failed to process base64 image',
          error: imageError.message 
        });
      }
    }
    // Handle regular file upload
    else if (req.file) {
      imagePath = `/uploads/community/${req.file.filename}`;
      
      return res.json({
        success: true,
        imageUrl: imagePath,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    }
    
    // No file provided
    return res.status(400).json({ message: 'No image file provided' });
  } catch (error) {
    console.error('Community upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload image',
      error: error.message 
    });
  }
});

// Appointment image upload endpoint (maintaining compatibility)
router.post('/appointment', upload.single('image'), async (req, res) => {
  try {
    const {
      imageBase64,
      imageFileName
    } = req.body;

    let imagePath = null;

    // Handle base64 image (for cross-device uploads) - following announcement pattern
    if (imageBase64 && imageFileName) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `appointment-${Date.now()}-${imageFileName}`;
        const filepath = path.join(appointmentDir, filename);
        
        // Ensure uploads directory exists
        if (!fs.existsSync(appointmentDir)) {
          fs.mkdirSync(appointmentDir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, buffer);
        imagePath = `/uploads/appointment/${filename}`;
        
        return res.json({
          success: true,
          imageUrl: imagePath,
          fileName: filename
        });
      } catch (imageError) {
        console.error('Failed to process base64 image:', imageError);
        return res.status(500).json({ 
          message: 'Failed to process base64 image',
          error: imageError.message 
        });
      }
    }
    // Handle regular file upload
    else if (req.file) {
      imagePath = `/uploads/appointment/${req.file.filename}`;
      
      return res.json({
        success: true,
        imageUrl: imagePath,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    }
    
    // No file provided
    return res.status(400).json({ message: 'No image file provided' });
  } catch (error) {
    console.error('Appointment upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload image',
      error: error.message 
    });
  }
});

// Get uploaded file
router.get('/community/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(communityDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

router.get('/appointment/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(appointmentDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

// Delete uploaded file
router.delete('/community/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(communityDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

router.delete('/appointment/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(appointmentDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

module.exports = router;