const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Location name like "Dhanmondi", "Banani"
  area: { type: String, required: true }, // Area name (renamed from location to avoid geo conflicts)
  posts: { type: Number, default: 0 }, // Count of discussions in this location
  image: { type: String }, // Default image for the location
}, {
  timestamps: true
});

module.exports = mongoose.model('Board', boardSchema);