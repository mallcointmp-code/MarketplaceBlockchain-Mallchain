// backend/models/SocialLink.js
const mongoose = require("mongoose");

const socialLinkSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: [
      "whatsapp",
      "facebook",
      "instagram",
      "twitter",
      "thread",
      "youtube",
      "tiktok",
      "telegram"
    ],
    required: true,
    unique: true,
  },
  url: { type: String, required: true },
  reward: { type: Number, default: 16.13 }, // ≈ Ksh 10
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SocialLink", socialLinkSchema);
