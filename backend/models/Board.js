const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: String,
  posts: Number,
  image: String, // optional URL
});

module.exports = mongoose.model('Board', boardSchema);
