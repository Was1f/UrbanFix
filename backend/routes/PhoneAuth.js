const express = require('express');
const router = express.Router();
const User = require('../models/User');

// In-memory OTP storage (for demo purposes)
const otpStore = new Map();

// Generate 5-digit OTP
const generateOTP = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Check if phone exists and generate OTP
router.post('/check-phone', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'Phone number not registered' });
    
    // Generate OTP for this phone number
    const otp = generateOTP();
    
    // Store OTP with expiration (5 minutes)
    otpStore.set(phone, {
      otp: otp,
      expires: Date.now() + (5 * 60 * 1000) // 5 minutes
    });
    
    // Log OTP to console for demo purposes
    console.log('🔐 OTP Generated for', phone, ':', otp);
    console.log('📱 Demo OTP Info:', {
      phone: phone,
      otp: otp,
      expiresIn: '5 minutes',
      timestamp: new Date().toLocaleString()
    });
    
    return res.json({ 
      success: true, 
      message: 'Phone exists. OTP sent successfully.',
      debug: process.env.NODE_ENV === 'development' ? { otp: otp } : undefined
    });
  } catch (error) {
    console.error('Error in check-phone:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Verify OTP and get user
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  
  if (!phone || !otp) {
    return res.status(400).json({ 
      success: false, 
      message: 'Phone number and 5-digit OTP are required' 
    });
  }

  try {
    // Check if OTP exists and is valid
    const storedOtpData = otpStore.get(phone);
    
    if (!storedOtpData) {
      return res.status(400).json({ 
        success: false, 
        message: 'No OTP found for this phone number. Please request a new OTP.' 
      });
    }
    
    // Check if OTP has expired
    if (Date.now() > storedOtpData.expires) {
      otpStore.delete(phone); // Clean up expired OTP
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired. Please request a new OTP.' 
      });
    }
    
    // Check if OTP matches
    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP. Please try again.' 
      });
    }
    
    // OTP is valid, get user data
    const user = await User.findOne({ phone }).select('-__v');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Clean up used OTP
    otpStore.delete(phone);
    
    console.log('✅ OTP verified successfully for:', phone);
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      user: user
    });
    
  } catch (err) {
    console.error('Error in verify-otp:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during OTP verification' 
    });
  }
});

// Get user by phone
router.post('/get-user-by-phone', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone is required' });

  try {
    const user = await User.findOne({ phone }).select('-__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
