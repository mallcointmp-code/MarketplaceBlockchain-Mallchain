const mongoose = require('mongoose');

const ProductAnalyticsSchema = new mongoose.Schema({
  productId: { type: mongoose.Types.ObjectId, ref: 'Product', unique: true },
  views: { type: Number, default: 0 },
  addsToCart: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProductAnalytics', ProductAnalyticsSchema);
