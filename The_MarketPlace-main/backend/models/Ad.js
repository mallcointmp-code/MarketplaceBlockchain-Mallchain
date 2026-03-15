// backend/models/Ad.js
const mongoose = require('mongoose');

const AdSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  media: [{ type: String }], // image/video URLs
  url: { type: String, default: "" }, // link target
  categories: [{ type: String }], // tags/categories
  regions: [{ type: String }], // country codes / region ids
  demographics: {
    ageMin: Number,
    ageMax: Number,
    genders: [String],
  },
  pricingModel: { type: String, enum: ["CPM","CPC","CPI"], default: "CPC" },
  priceValue: { type: Number, default: 10 }, // price per event in KSH (or units)
  budget: { type: Number, default: 0 }, // KSH budget allocated
  escrowReserved: { type: Number, default: 0 }, // reserved in escrow
  status: { type: String, enum: ["pending","approved","rejected","paused","running","ended"], default: "pending" },
  startAt: Date,
  endAt: Date,
  impressionsTarget: Number,
  clicksTarget: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  moderationNotes: String,
  approvedBy: { type: mongoose.Types.ObjectId, ref: "User" }
});

AdSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model("Ad", AdSchema);

module.exports = { mongoose, AdSchema };