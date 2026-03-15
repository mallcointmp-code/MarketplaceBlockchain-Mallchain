const mongoose = require('mongoose');

const bugReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["open", "reviewed", "resolved"], default: "open" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.BugReport || mongoose.model("BugReport", bugReportSchema);

module.exports = { mongoose, bugReportSchema };