const mongoose = require('mongoose');

const AdImpressionSchema = new mongoose.Schema({
  adId: { type: mongoose.Types.ObjectId, ref: 'Ad', required: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['impression','click'], default: 'impression' },
  ip: String,
  userAgent: String,
  createdAt: { type: Date, default: Date.now }
});

AdImpressionSchema.index({ adId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.models.AdImpression || mongoose.model('AdImpression', AdImpressionSchema);

module.exports = { mongoose, AdImpressionSchema };