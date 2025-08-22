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

    res.json({ success: true, message: 'OTP sent to email. Please verify.' });

  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ----------------------------
// Step 2: Verify OTP & Create User
// ----------------------------
router.post('/verify', async (req, res) => {
  try {
    const { email, otp, password, ...rest } = req.body;

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

    // 2️⃣ Create new user
    const newUser = new User({
      ...rest,
      email,
      password, // hash this in production
      isVerified: true
    });
    await newUser.save();

    // 3️⃣ Clear OTP
    otpStore.delete(email);

    res.json({ success: true, message: 'Account created successfully!', user: newUser });

  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
