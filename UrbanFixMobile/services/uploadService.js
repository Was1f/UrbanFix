// services/uploadService.js
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

class UploadService {
  constructor() {
    // You can configure different upload providers here
    // Use local server on Web to avoid exposing Cloudinary credentials
    this.uploadProvider = Platform.OS === 'web' ? 'local' : 'cloudinary'; // or 'aws-s3', 'firebase', etc.
    
    // Configure your upload settings
    this.config = {
      cloudinary: {
        cloudName: 'YOUR_CLOUD_NAME',
        uploadPreset: 'YOUR_UPLOAD_PRESET',
        apiKey: 'YOUR_API_KEY'
      },
      // Add other provider configs as needed
    };
  }

  // Cross-platform file info (web-safe)
  async getFileInfo(fileUri) {
    if (Platform.OS !== 'web') {
      return await FileSystem.getInfoAsync(fileUri);
    }
    // Web: try to fetch the blob to derive size and existence
    try {
      const res = await fetch(fileUri);
      if (!res.ok) {
        return { exists: false };
      }
      const blob = await res.blob();
      return {
        exists: true,
        size: blob.size,
        mimeType: blob.type,
      };
    } catch (e) {
      return { exists: false };
    }
  }

  // Build a FormData-compatible file value for RN (native) and Web
  async buildFormDataFile(fileUri, fileName, mimeType) {
    if (Platform.OS === 'web') {
      const res = await fetch(fileUri);
      const blob = await res.blob();
      // Prefer actual Blob type; fall back to provided mimeType
      const resolvedType = blob.type || mimeType || 'application/octet-stream';
      // File constructor is available in browsers
      return new File([blob], fileName, { type: resolvedType });
    }
    // React Native (iOS/Android) style descriptor
    return {
      uri: fileUri,
      type: mimeType,
      name: fileName,
    };
  }

  // Generic upload method that handles both images and audio
  async uploadFile(fileUri, fileType = 'auto') {
    try {
      if (!fileUri) {
        throw new Error('No file URI provided');
      }

      // Get file info
      const fileInfo = await this.getFileInfo(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Determine file type if auto
      if (fileType === 'auto') {
        fileType = this.detectFileType(fileUri);
      }

      // Upload based on configured provider
      switch (this.uploadProvider) {
        case 'cloudinary':
          return await this.uploadToCloudinary(fileUri, fileType);
        case 'aws-s3':
          return await this.uploadToS3(fileUri, fileType);
        case 'firebase':
          return await this.uploadToFirebase(fileUri, fileType);
        case 'local':
          return await this.uploadToLocalServer(fileUri, fileType);
        default:
          throw new Error('No upload provider configured');
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Detect file type from URI
  detectFileType(fileUri) {
    const extension = fileUri.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg'];
    
    if (imageExts.includes(extension)) return 'image';
    if (audioExts.includes(extension)) return 'audio';
    return 'unknown';
  }

  // Upload to Cloudinary
  async uploadToCloudinary(fileUri, fileType) {
    try {
      const { cloudName, uploadPreset } = this.config.cloudinary;
      
      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration missing');
      }

      // Create form data
      const formData = new FormData();
      
      // Get file name and mime type
      const fileName = fileUri.split('/').pop();
      const mimeType = this.getMimeType(fileUri, fileType);
      const fileValue = await this.buildFormDataFile(fileUri, fileName, mimeType);
      formData.append('file', fileValue);
      
      formData.append('upload_preset', uploadPreset);
      
      // Set resource type for Cloudinary
      const resourceType = fileType === 'audio' ? 'video' : 'image'; // Cloudinary uses 'video' for audio
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
          // Do not set Content-Type manually; let the runtime set the boundary
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudinary upload failed: ${errorText}`);
      }

      const result = await response.json();
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
    }
  }

  // Upload to your local server
  async uploadToLocalServer(fileUri, fileType) {
    try {
      const formData = new FormData();
      
      const fileName = fileUri.split('/').pop();
      const mimeType = this.getMimeType(fileUri, fileType);
      const fileValue = await this.buildFormDataFile(fileUri, fileName, mimeType);
      formData.append('file', fileValue);

      // Import the API URL function
      const { apiUrl } = await import('../constants/api');
      const uploadUrl = apiUrl('/api/upload/single');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        // Let the runtime set proper multipart boundaries
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      return {
        url: result.url,
        fileName: result.fileName,
        originalName: result.originalName,
        size: result.size,
        mimeType: result.mimeType,
      };
    } catch (error) {
      console.error('Server upload error:', error);
      throw new Error(`Failed to upload to server: ${error.message}`);
    }
  }

  // Upload to AWS S3 (placeholder - requires AWS SDK)
  async uploadToS3(fileUri, fileType) {
    throw new Error('AWS S3 upload not implemented. Please install and configure AWS SDK.');
  }

  // Upload to Firebase (placeholder - requires Firebase SDK)
  async uploadToFirebase(fileUri, fileType) {
    throw new Error('Firebase upload not implemented. Please install and configure Firebase SDK.');
  }

  // Get MIME type based on file extension
  getMimeType(fileUri, fileType) {
    const extension = fileUri.split('.').pop().toLowerCase();
    
    // Image MIME types
    const imageMimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    
    // Audio MIME types
    const audioMimeTypes = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg',
    };
    
    if (fileType === 'image' && imageMimeTypes[extension]) {
      return imageMimeTypes[extension];
    }
    
    if (fileType === 'audio' && audioMimeTypes[extension]) {
      return audioMimeTypes[extension];
    }
    
    return 'application/octet-stream'; // Default fallback
  }

  // Validate file before upload
  async validateFile(fileUri, fileType, maxSize = 50 * 1024 * 1024) { // 50MB default
    try {
      const fileInfo = await this.getFileInfo(fileUri);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }
      
      if (fileInfo.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
      }
      
      // Determine detected type via extension or MIME (web)
      let detectedType = this.detectFileType(fileUri);
      if (!detectedType || detectedType === 'unknown') {
        const mime = fileInfo.mimeType || '';
        if (mime.startsWith('image/')) detectedType = 'image';
        else if (mime.startsWith('audio/')) detectedType = 'audio';
      }

      // Only enforce mismatch if we could detect a type
      if (fileType !== 'auto' && detectedType && detectedType !== 'unknown' && detectedType !== fileType) {
        throw new Error(`File type mismatch. Expected ${fileType}, got ${detectedType}`);
      }
      
      return true;
    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }

  // Get upload progress (for future implementation)
  onUploadProgress(callback) {
    this.progressCallback = callback;
  }
}

export default new UploadService();