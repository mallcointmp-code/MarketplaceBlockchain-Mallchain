const mongoose = require('mongoose');

const ProductOrderStatsSchema = new mongoose.Schema({
  productId: { type: mongoose.Types.ObjectId, ref: 'Product', index: true },
  orderId: { type: mongoose.Types.ObjectId, ref: 'Order' },
  sellerId: { type: mongoose.Types.ObjectId, ref: 'User', index: true },
  qty: { type: Number, default: 1 },
  price: Number,
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('ProductOrderStats', ProductOrderStatsSchema);
