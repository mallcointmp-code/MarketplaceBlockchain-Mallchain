const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  reward: { type: Number, default: 0 },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // Map 'creator' to 'creatorId' for consistency or allow both? The route used 'creator'.
  // Let's rely on 'creator' field in route logic, but here it says creatorId.
  // We'll add 'creator' alias reference.
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  platform: { type: String, enum: ["TikTok", "YouTube", "Instagram", "Twitter", "youtube", "instagram", "twitter", "tiktok"], required: true },
  link: { type: String, required: true }, // or contentLink
  contentLink: { type: String },
  budget: { type: Number, default: 0 },
  instructions: { type: String },
  durationDays: { type: Number, default: 7 },
  startTime: { type: Date },
  status: { type: String, enum: ["pending", "active", "completed", "rejected"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Task", taskSchema);
