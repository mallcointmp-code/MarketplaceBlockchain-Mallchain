// backend/models/SocialTask.js
const mongoose = require("mongoose");

const socialTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  platform: {
    type: String,
    enum: ["whatsapp", "facebook", "instagram", "twitter", "thread", "youtube", "tiktok", "telegram"],
    required: true,
  },
  description: { type: String },
  taskUrl: { type: String, required: true },
  rewardKES: { type: Number, default: 10 },
  rewardMallcoins: { type: Number },
  deadline: { type: Date },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SocialTask", socialTaskSchema);
