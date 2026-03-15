const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  endpoint: String,
  method: String,
  ip: String,
  status: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.models.AccessLog || mongoose.model("AccessLog", accessLogSchema);

module.exports = { mongoose, accessLogSchema };