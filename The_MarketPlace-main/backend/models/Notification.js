// backend/models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: String,
  category: { type: String, enum: ["wallet", "market", "system", "social"], default: "system" },
  message: String,
  details: mongoose.Schema.Types.Mixed,
  read: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },
  scheduledAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);
