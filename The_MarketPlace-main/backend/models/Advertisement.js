const mongoose = require('mongoose');
const { Schema } = mongoose;

const AdCreativeSchema = new Schema({
  type: { type: String, enum: ['image', 'video', 'html'], default: 'image' },
  url: String,
  html: String,
  altText: String,
  width: Number,
  height: Number
}, { _id: false });

const AdvertisementSchema = new Schema({
  sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  creative: AdCreativeSchema,
  placement: { type: String, required: true, index: true },
  startAt: Date,
  endAt: Date,
  budget: { type: Number, default: 0 },
  currency: { type: String, enum: ['KSH','MLCNS','MLPTS','MONEY'], default: 'KSH' },
  bidPerImpression: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  status: { type: String, enum: ['pending','approved','active','paused','rejected','completed'], default: 'pending', index: true },
  adminNote: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

AdvertisementSchema.index({ placement: 1, status: 1, startAt: 1, endAt: 1 });

module.exports = mongoose.models.Advertisement || mongoose.model('Advertisement', AdvertisementSchema);

module.exports = { mongoose, AdCreativeSchema, AdvertisementSchema };