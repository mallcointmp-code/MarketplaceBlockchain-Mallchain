// backend/models/SocialTaskCompletion.js
const mongoose = require("mongoose");

const socialTaskCompletionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  socialTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "SocialLink", required: true },
  completed: { type: Boolean, default: false },
  rewarded: { type: Boolean, default: false },
  completedAt: { type: Date, default: Date.now },
});

socialTaskCompletionSchema.index({ userId: 1, socialTaskId: 1 }, { unique: true });

module.exports = mongoose.model("SocialTaskCompletion", socialTaskCompletionSchema);
