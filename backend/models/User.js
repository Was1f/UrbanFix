const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  email: String,
  fname: String,
  lname: String,
  address: String,
  nid: String,
  profession: String,
  points: Number,
  verificationBadge: Boolean,
  location: String,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
