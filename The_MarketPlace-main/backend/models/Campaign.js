const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  platform: { type: String, enum: ["TikTok", "YouTube", "Instagram", "Twitter"], required: true },
  mlptsPerAction: { type: Number, required: true }, // e.g., 50 MLPTS/view
  totalMlptsFunded: { type: Number, default: 0 },
  actionsTarget: { type: Number, default: 0 }, // desired completions
  actionsCompleted: { type: Number, default: 0 },
  status: { type: String, enum: ["draft","funded","active","completed","paused","cancelled"], default: "draft" },
  startAt: { type: Date },
  deadline: { type: Date },
  extra: { type: Object }, // free-form metadata
}, { timestamps: true });

module.exports = mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);

module.exports = { mongoose, CampaignSchema };