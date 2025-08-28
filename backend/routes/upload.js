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
const profileDir = path.join(uploadDir, 'profile'); // New profile pictures directory
const ticketsDir = path.join(uploadDir, 'tickets'); // New tickets directory
const audioDir = path.join(communityDir, 'audio');
const videoDir = path.join(communityDir, 'video');

[uploadDir, communityDir, appointmentDir, profileDir, ticketsDir, audioDir, videoDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for different upload types
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'audio') {
      cb(null, audioDir);
    } else if (file.fieldname === 'video') {
      cb(null, videoDir);
    } else {
      // For general uploads, use the type from body
      const uploadType = req.body.type || 'community';
      let destDir;
      
      switch (uploadType) {
        case 'profile':
          destDir = profileDir;
          break;
        case 'appointment':
          destDir = appointmentDir;
          break;
        case 'ticket':
          destDir = ticketsDir;
          break;
        default:
          destDir = communityDir;
      }
      
      cb(null, destDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos, 10MB for others
  },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'audio') {
      // Allow audio files
      const allowedAudioTypes = /mp3|wav|m4a|aac|ogg/;
      const extname = allowedAudioTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = file.mimetype.startsWith('audio/');

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed (mp3, wav, m4a, aac, ogg)'));
      }
    } else if (file.fieldname === 'video') {
      // Allow video files
      const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;
      const extname = allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = file.mimetype.startsWith('video/');

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only video files are allowed (mp4, mov, avi, mkv, webm)'));
      }
    } else {
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
  }
});
router.use((req, res, next) => {
  console.log(`Upload route hit: ${req.method} ${req.path}`);
  console.log('Body:', req.body);
  next();
});
// Add this test route at the top of your upload.js
router.get('/test', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'Upload routes working' });
});

// Simple test endpoint without multer to check if the issue is with file handling
router.post('/test-upload', (req, res) => {
  console.log('=== TEST UPLOAD REQUEST ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Files:', req.files);
  res.json({ 
    success: true, 
    message: 'Test endpoint reached',
    headers: req.headers,
    body: req.body
  });
});

// Base64 image upload endpoint for profile pictures
router.post('/base64', async (req, res) => {
  try {
    console.log('=== BASE64 UPLOAD REQUEST ===');
    console.log('Body keys:', Object.keys(req.body));
    
    const { imageBase64, imageFileName, type } = req.body;
    
    if (!imageBase64 || !imageFileName) {
      return res.status(400).json({
        success: false,
        message: 'Image data and filename are required'
      });
    }

    // Extract base64 data (remove data:type/subtype;base64, prefix)
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid base64 image data format' 
      });
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Validate MIME type
    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid image type' 
      });
    }
    
    // Check file size (approximate: base64Length * 0.75)
    const approximateFileSize = base64Data.length * 0.75;
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    
    if (approximateFileSize > maxFileSize) {
      return res.status(400).json({ 
        success: false,
        message: `Image too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB.`,
        approximateSize: Math.round(approximateFileSize / 1024 / 1024) + 'MB'
      });
    }
    
    // Determine destination directory
    let destDir;
    let urlPrefix;
    
         switch (type) {
       case 'profile':
         destDir = profileDir;
         urlPrefix = '/uploads/profile';
         break;
       case 'community':
         destDir = communityDir;
         urlPrefix = '/uploads/community';
         break;
       case 'appointment':
         destDir = appointmentDir;
         urlPrefix = '/uploads/appointment';
         break;
       case 'ticket':
         destDir = ticketsDir;
         urlPrefix = '/uploads/tickets';
         break;
       default:
         destDir = uploadDir;
         urlPrefix = '/uploads';
     }
    
    // Convert base64 to buffer and save file
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const uniqueFileName = `${type}-${uuidv4()}-${Date.now()}-${imageFileName}`;
    const filePath = path.join(destDir, uniqueFileName);
    
    // Ensure directory exists
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Write file to disk
    fs.writeFileSync(filePath, imageBuffer);
    
    const imageUrl = `${urlPrefix}/${uniqueFileName}`;
    
    console.log('✅ Base64 image uploaded successfully:', imageUrl);
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      filePath: imageUrl,
      fileName: uniqueFileName,
      originalName: imageFileName,
      size: imageBuffer.length,
      mimetype: mimeType
    });

  } catch (error) {
    console.error('❌ Base64 upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

// General file upload endpoint for profile pictures and other files
router.post('/', upload.single('file'), async (req, res) => {
  try {
    console.log('=== GENERAL UPLOAD REQUEST ===');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const uploadType = req.body.type || 'general';
    let filePath;
    let destDir;

    // Determine destination directory based on type
    switch (uploadType) {
      case 'profile':
        destDir = profileDir;
        break;
      case 'community':
        destDir = communityDir;
        break;
      case 'appointment':
        destDir = appointmentDir;
        break;
      default:
        destDir = uploadDir;
    }

    // Move file to appropriate directory if it's not already there
    if (req.file.destination !== destDir) {
      const newFilePath = path.join(destDir, req.file.filename);
      fs.renameSync(req.file.path, newFilePath);
      filePath = `/uploads/${uploadType}/${req.file.filename}`;
    } else {
      filePath = `/uploads/${uploadType}/${req.file.filename}`;
    }

    console.log('✅ File uploaded successfully:', filePath);
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      filePath: filePath,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});
// Unified community media upload endpoint
router.post('/community', async (req, res) => {
  try {
    const {
      mediaBase64,
      mediaFileName,
      mediaType,
      imageBase64,
      imageFileName
    } = req.body;

    // Handle base64 media uploads (images, videos, audio)
    if (mediaBase64 && mediaFileName && mediaType) {
      try {
        // Extract base64 data (remove data:type/subtype;base64, prefix)
        const matches = mediaBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ message: 'Invalid base64 media data format' });
        }
        
        const mimeType = matches[1];
        const base64Data = matches[2];
        
        // Validate MIME type based on media type
        let allowedMimeTypes = [];
        let maxFileSize = 10 * 1024 * 1024; // 10MB default
        let destinationDir = communityDir;
        let urlPrefix = '/uploads/community';
        
        switch (mediaType) {
          case 'image':
            allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            break;
          case 'video':
            allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
            maxFileSize = 50 * 1024 * 1024; // 50MB for videos
            destinationDir = videoDir;
            urlPrefix = '/uploads/community/video';
            break;
          case 'audio':
            allowedMimeTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/aac', 'audio/ogg'];
            destinationDir = audioDir;
            urlPrefix = '/uploads/community/audio';
            break;
          default:
            return res.status(400).json({ message: 'Invalid media type. Must be image, video, or audio.' });
        }
        
        if (!allowedMimeTypes.includes(mimeType)) {
          return res.status(400).json({ 
            message: `Invalid ${mediaType} type. Allowed types: ${allowedMimeTypes.join(', ')}` 
          });
        }
        
        // Check base64 data size (approximate file size = base64Length * 0.75)
        const approximateFileSize = base64Data.length * 0.75;
        
        if (approximateFileSize > maxFileSize) {
          return res.status(400).json({ 
            message: `${mediaType} too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB.`,
            approximateSize: Math.round(approximateFileSize / 1024 / 1024) + 'MB'
          });
        }
        
        const mediaBuffer = Buffer.from(base64Data, 'base64');
        const uniqueFileName = `${mediaType}-${uuidv4()}-${Date.now()}-${mediaFileName}`;
        const filePath = path.join(destinationDir, uniqueFileName);
        
        // Write file to disk
        fs.writeFileSync(filePath, mediaBuffer);
        
        const mediaUrl = `${urlPrefix}/${uniqueFileName}`;
        return res.json({
          success: true,
          mediaUrl: mediaUrl,
          imageUrl: mediaUrl, // For backward compatibility
          fileName: uniqueFileName,
          fileSize: mediaBuffer.length,
          mediaType: mediaType
        });
        
      } catch (mediaError) {
        console.error('Failed to process base64 media:', mediaError);
        return res.status(500).json({ 
          message: 'Failed to process base64 media',
          error: mediaError.message 
        });
      }
    }
    
    // Handle legacy base64 image uploads (for backward compatibility)
    else if (imageBase64 && imageFileName) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `community-${Date.now()}-${imageFileName}`;
        const filepath = path.join(communityDir, filename);
        
        fs.writeFileSync(filepath, buffer);
        const imagePath = `/uploads/community/${filename}`;
        
        return res.json({
          success: true,
          imageUrl: imagePath,
          mediaUrl: imagePath,
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
      let mediaPath;
      if (req.file.fieldname === 'audio') {
        mediaPath = `/uploads/community/audio/${req.file.filename}`;
      } else if (req.file.fieldname === 'video') {
        mediaPath = `/uploads/community/video/${req.file.filename}`;
      } else {
        mediaPath = `/uploads/community/${req.file.filename}`;
      }
      
      return res.json({
        success: true,
        mediaUrl: mediaPath,
        imageUrl: mediaPath, // For backward compatibility
        fileName: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    }
    
    // No file provided
    return res.status(400).json({ message: 'No media file provided' });
    
  } catch (error) {
    console.error('Community upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload media',
      error: error.message 
    });
  }
});

// Legacy audio upload endpoint (for backward compatibility)
router.post('/community-audio', async (req, res) => {
  try {
    const { audioBase64, audioFileName } = req.body;

    if (!audioBase64) {
      return res.status(400).json({
        success: false,
        message: 'No audio data provided'
      });
    }

    const base64Data = audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, '');
    
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1E9);
    const extension = audioFileName ? path.extname(audioFileName) : '.m4a';
    const filename = `audio-${timestamp}-${randomNum}${extension}`;
    const filePath = path.join(audioDir, filename);

    fs.writeFileSync(filePath, base64Data, 'base64');

    const audioUrl = `/uploads/community/audio/${filename}`;
    
    res.json({
      success: true,
      audioUrl: audioUrl,
      mediaUrl: audioUrl,
      filename: filename,
      message: 'Audio uploaded successfully'
    });

  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload audio'
    });
  }
});

// Appointment image upload endpoint (maintaining compatibility)
router.post('/appointment', upload.single('image'), async (req, res) => {
  try {
    const { imageBase64, imageFileName } = req.body;
    let imagePath = null;

    if (imageBase64 && imageFileName) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `appointment-${Date.now()}-${imageFileName}`;
        const filepath = path.join(appointmentDir, filename);
        
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
    
    return res.status(400).json({ message: 'No image file provided' });
  } catch (error) {
    console.error('Appointment upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload image',
      error: error.message 
    });
  }
});

// File serving endpoints
router.get('/community/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(communityDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

router.get('/community/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(audioDir, filename);
  
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'audio/mpeg';
    
    switch (ext) {
      case '.m4a':
        contentType = 'audio/mp4';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.ogg':
        contentType = 'audio/ogg';
        break;
      case '.aac':
        contentType = 'audio/aac';
        break;
      default:
        contentType = 'audio/mpeg';
    }
    
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Audio file not found' });
  }
});

router.get('/community/video/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(videoDir, filename);
  
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'video/mp4';
    
    switch (ext) {
      case '.mov':
        contentType = 'video/quicktime';
        break;
      case '.avi':
        contentType = 'video/x-msvideo';
        break;
      case '.webm':
        contentType = 'video/webm';
        break;
      case '.mkv':
        contentType = 'video/x-matroska';
        break;
      default:
        contentType = 'video/mp4';
    }
    
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Video file not found' });
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

router.get('/tickets/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(ticketsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

// File deletion endpoints
router.delete('/community/:filename', (req, res) => {
  console.log('=== UPLOAD REQUEST DEBUG ===');
  console.log('Headers:', req.headers);
  console.log('Body keys:', Object.keys(req.body));
  console.log('Body:', req.body);
  console.log('Files:', req.file);
  console.log('=== END DEBUG ===');
  
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

router.delete('/community/audio/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(audioDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Audio file deleted successfully' });
    } else {
      res.status(404).json({ message: 'Audio file not found' });
    }
  } catch (error) {
    console.error('Delete audio error:', error);
    res.status(500).json({ message: 'Failed to delete audio file' });
  }
});

router.delete('/community/video/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(videoDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Video file deleted successfully' });
    } else {
      res.status(404).json({ message: 'Video file not found' });
    }
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ message: 'Failed to delete video file' });
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

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB for videos, 10MB for other files.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: error.message || 'Upload failed'
  });
});

module.exports = router;