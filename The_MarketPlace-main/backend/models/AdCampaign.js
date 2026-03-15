const mongoose = require('mongoose');

const AdCampaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  createdBy: { type: mongoose.Types.ObjectId, ref: 'User' },
  slotKey: { type: String, required: true },
  placement: { type: String }, // alias for slotKey if needed
  pricePerSlot: { type: Number, required: true },
  durationDays: { type: Number, default: 7 },
  totalSlots: { type: Number, default: 1 },
  takenSlots: { type: Number, default: 0 },
  approvals: {
    approved: { type: Boolean, default: false },
    approvedAt: Date,
    approvedBy: { type: mongoose.Types.ObjectId, ref: 'User' }
  },
  creatives: [{
    sellerId: { type: mongoose.Types.ObjectId, ref: 'User' },
    image: String,
    altText: String,
    destinationUrl: String,
    shopId: { type: mongoose.Types.ObjectId, ref: 'Shop' },
    shopName: String,
    uploadedAt: Date,
    status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
    reason: String
  }],
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  // optional budget/currency fields to support per-impression billing
  budget: { type: Number, default: 0 },
  currency: { type: String, enum: ['KSH','MLCNS','MLPTS','MONEY'], default: 'KSH' },
  bidPerImpression: { type: Number, default: 0 },
  status: { type: String, enum: ['pending','approved','active','paused','rejected','completed'], default: 'pending' },
  adminNote: String,
  createdAt: { type: Date, default: Date.now },
  startsAt: Date,
  endsAt: Date,
  updatedAt: Date
});

// index for faster slot/placement lookups and status/time filtering
AdCampaignSchema.index({ slotKey: 1 });
AdCampaignSchema.index({ slotKey: 1, status: 1, startsAt: 1, endsAt: 1 });

module.exports = mongoose.models.AdCampaign || mongoose.model('AdCampaign', AdCampaignSchema);

module.exports = { mongoose, AdCampaignSchema };