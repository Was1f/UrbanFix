const express = require('express');
const router = express.Router();
const User = require('../models/User');
const transporter = require('../config/email'); // for email OTP
const otpStore = new Map();

// Generate 5-digit OTP
const generateOTP = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// 🔹 Step 1: Login request → Check if user exists (by email or phone), then send OTP
router.post('/login-request', async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ success: false, message: 'Email or phone is required' });
  }

  try {
    // Find user by email or phone
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user is banned
    if (user.isBanned) {
      // Check if ban is expired for temporary bans
      if (user.banExpiryDate && Date.now() > user.banExpiryDate) {
        // Ban expired, remove ban status
        user.isBanned = false;
        user.banReason = undefined;
        user.banDate = undefined;
        user.banExpiryDate = undefined;
        user.bannedBy = undefined;
        await user.save();
      } else {
        // User is still banned
        const banMessage = user.banExpiryDate 
          ? `Your account is temporarily banned until ${new Date(user.banExpiryDate).toLocaleDateString()}. Reason: ${user.banReason}`
          : `Your account is permanently banned. Reason: ${user.banReason}`;
        
        return res.status(403).json({ 
          success: false, 
          message: banMessage,
          error: 'ACCOUNT_BANNED',
          banDetails: {
            reason: user.banReason,
            banDate: user.banDate,
            expiryDate: user.banExpiryDate
          }
        });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const key = email || phone;

    // Store OTP with expiration (5 minutes)
    otpStore.set(key, {
      otp,
      expires: Date.now() + 5 * 60 * 1000 // 5 min
    });

    // Always send OTP to the user's email
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject: 'UrbanFix Login OTP',
      text: `Your OTP for login is: ${otp}`,
      html: `<p>Your OTP for login is: <b>${otp}</b></p>`
    });

    console.log(`📧 OTP sent to email: ${user.email} → ${otp}`);

    res.json({
      success: true,
      message: `OTP sent to user's email`,
      debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
    });

  } catch (error) {
    console.error('Error in login-request:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 🔹 Step 2: Verify OTP for login
router.post('/login-verify', async (req, res) => {
  const { email, phone, otp } = req.body;

  if ((!email && !phone) || !otp) {
    return res.status(400).json({ success: false, message: 'Email/Phone and OTP are required' });
  }

  try {
    const key = email || phone;
    const storedOtpData = otpStore.get(key);

    if (!storedOtpData) {
      return res.status(400).json({ success: false, message: 'No OTP found. Please request again.' });
    }

    if (Date.now() > storedOtpData.expires) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, message: 'OTP expired. Please request again.' });
    }

    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // OTP verified → Fetch user
    const user = await User.findOne(email ? { email } : { phone }).select('-__v');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Double-check ban status (in case user was banned between OTP request and verification)
    if (user.isBanned) {
      // Check if ban is expired for temporary bans
      if (user.banExpiryDate && Date.now() > user.banExpiryDate) {
        // Ban expired, remove ban status
        user.isBanned = false;
        user.banReason = undefined;
        user.banDate = undefined;
        user.banExpiryDate = undefined;
        user.bannedBy = undefined;
        await user.save();
      } else {
        // User is still banned
        const banMessage = user.banExpiryDate 
          ? `Your account is temporarily banned until ${new Date(user.banExpiryDate).toLocaleDateString()}. Reason: ${user.banReason}`
          : `Your account is permanently banned. Reason: ${user.banReason}`;
        
        return res.status(403).json({ 
          success: false, 
          message: banMessage,
          error: 'ACCOUNT_BANNED',
          banDetails: {
            reason: user.banReason,
            banDate: user.banDate,
            expiryDate: user.banExpiryDate
          }
        });
      }
    }

    // Delete OTP after success
    otpStore.delete(key);

    console.log(`✅ OTP verified for ${key}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: user
    });

  } catch (error) {
    console.error('Error in login-verify:', error);
    res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
});

module.exports = router;
