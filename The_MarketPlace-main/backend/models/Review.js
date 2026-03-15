const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Types.ObjectId, ref: 'Product', required: true, index: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Types.ObjectId, ref: 'Order' },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, default: '' },
  body: { type: String, default: '' },
  images: [{ url: String }],
  helpfulUp: { type: Number, default: 0 },
  helpfulDown: { type: Number, default: 0 },
  verifiedPurchase: { type: Boolean, default: false },
  reported: { type: Boolean, default: false },
  moderated: { type: Boolean, default: false },
  moderationNote: { type: String, default: '' },
  visible: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

ReviewSchema.index({ productId: 1, userId: 1 });
ReviewSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
