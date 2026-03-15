const mongoose = require('mongoose');

const AdClickSchema = new mongoose.Schema({
  adId: { type: mongoose.Types.ObjectId, ref: 'Ad', required: true, index: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User' },
  ts: { type: Date, default: Date.now }
});

AdClickSchema.index({ adId: 1, ts: -1 });

module.exports = mongoose.model('AdClick', AdClickSchema);

module.exports = { mongoose, AdClickSchema };