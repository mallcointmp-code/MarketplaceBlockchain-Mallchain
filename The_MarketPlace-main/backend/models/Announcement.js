const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: String,
  message: String,
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);
module.exports = { mongoose, announcementSchema };