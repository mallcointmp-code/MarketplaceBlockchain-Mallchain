const mongoose = require('mongoose');

const TaskCampaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  publisherId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
  platform: { type: String, required: true },
  action: { type: String, required: true },
  link: { type: String },
  rewardPerAction: { type: Number, required: true }, // mallpoints
  budget: { type: Number, required: true }, // total mallpoints allocated
  remaining: { type: Number, required: true },
  status: { type: String, enum: ['active','paused','completed','cancelled'], default: 'active' },
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

TaskCampaignSchema.index({ publisherId: 1, status: 1 });

module.exports = mongoose.models.TaskCampaign || mongoose.model('TaskCampaign', TaskCampaignSchema);
