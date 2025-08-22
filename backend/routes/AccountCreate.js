const express = require('express');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ----------------------------
// Nodemailer transporter
// ----------------------------
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: parseInt(process.env.BREVO_SMTP_PORT, 10),
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER, // your Brevo SMTP login
    pass: process.env.BREVO_SMTP_PASS  // your Brevo SMTP key
  },
});

// In-memory OTP store (you can later move to Redis or DB)
const otpStore = new Map();

// ----------------------------
// Step 1: Create Account & Send OTP
// ----------------------------
router.post('/create', async (req, res) => {
  try {
    const {
      fname, lname, phone, email, username, password,
      address, dob, gender, occupation, skills, languages,
      emergencyName, emergencyPhone, bloodGroup, medicalConditions, nid,
      profilePic, bio, helpType
    } = req.body;

    // 1️⃣ Check duplicates
    const existing = await User.findOne({ $or: [
      { email }, { phone }, { username }
    ]});

    if(existing) return res.status(400).json({ success: false, message: 'Email, phone, or username already exists.' });

    // 2️⃣ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    otpStore.set(email, { otp, expires: Date.now() + 5*60*1000 }); // 5 min

    // 3️⃣ Send OTP email
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Your UrbanFix OTP Code',
      text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`
    });

    // 4️⃣ Log OTP in terminal for development
    console.log(`📧 OTP sent to ${email}: ${otp}`);
    console.log(`⏰ OTP expires at: ${new Date(Date.now() + 5*60*1000).toLocaleString()}`);
    console.log(`🕐 Sent at: ${new Date().toLocaleString()}`);

    res.json({ 
      success: true, 
      message: 'OTP sent to email. Please verify.',
      debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
    });

  } catch(err) {
    console.error('❌ Error creating user account:', err);
    
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      console.error('📝 Validation errors:', validationErrors);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ----------------------------
// Step 2: Verify OTP & Create User
// ----------------------------
router.post('/verify', async (req, res) => {
  try {
    const { email, otp, password, ...rest } = req.body;
    
    // Debug logging
    console.log('📝 Received data structure:');
    console.log('- Email:', email);
    console.log('- Has OTP:', !!otp);
    console.log('- Has password:', !!password);
    console.log('- Profile pic type:', typeof rest.profilePic);
    console.log('- Profile pic length:', rest.profilePic ? rest.profilePic.length : 'none');

    if(!otpStore.has(email)) return res.status(400).json({ success: false, message: 'No OTP request found for this email.' });

    const stored = otpStore.get(email);
    if(Date.now() > stored.expires) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: 'OTP expired. Please request again.' });
    }

    if(otp !== stored.otp) return res.status(400).json({ success: false, message: 'Invalid OTP.' });

    // 1️⃣ Check duplicates again (race condition safety)
    const existing = await User.findOne({ $or: [
      { email }, { phone: rest.phone }, { username: rest.username }
    ]});

    if(existing) return res.status(400).json({ success: false, message: 'Email, phone, or username already exists.' });

    // 2️⃣ Process profile picture if provided
    let processedProfilePic = null;
    if (rest.profilePic && typeof rest.profilePic === 'string') {
      // This is now a file path from uploads folder
      processedProfilePic = {
        uri: rest.profilePic, // The file path from uploads folder
        type: 'image/jpeg',
        size: 0 // We don't know the size, but it's not critical
      };
      console.log(`🖼️ Profile picture path: ${rest.profilePic}`);
    }

    // 3️⃣ Create new user - exclude profilePic from rest to avoid conflicts
    const { profilePic, ...userData } = rest;
    
    console.log('🔧 Final user data structure:');
    console.log('- profilePic:', processedProfilePic ? 'processed' : 'none');
    console.log('- userData keys:', Object.keys(userData));
    
    const newUser = new User({
      ...userData,
      profilePic: processedProfilePic, // Use processed profile pic
      email,
      password, // hash this in production
      isVerified: true
    });
    await newUser.save();

    // 3️⃣ Clear OTP
    otpStore.delete(email);

    console.log(`✅ User account created successfully: ${newUser.email}`);
    res.json({ success: true, message: 'Account created successfully!', user: newUser });

  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Test endpoint to verify User model validation
router.post('/test-profile-pic', async (req, res) => {
  try {
    const { profilePic } = req.body;
    
    console.log('🧪 Testing profile picture validation:');
    console.log('- Type:', typeof profilePic);
    console.log('- Length:', profilePic ? profilePic.length : 'none');
    
    if (profilePic && typeof profilePic === 'string') {
      const testProfilePic = {
        uri: `data:image/jpeg;base64,${profilePic}`,
        type: 'image/jpeg',
        size: Math.ceil((profilePic.length * 3) / 4)
      };
      
      console.log('✅ Test profile picture structure:', testProfilePic);
      res.json({ success: true, message: 'Profile picture structure is valid' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid profile picture data' });
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({ success: false, message: 'Test failed', error: error.message });
  }
});

module.exports = router;
