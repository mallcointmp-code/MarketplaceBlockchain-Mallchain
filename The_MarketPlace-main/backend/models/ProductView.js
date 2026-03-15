const mongoose = require('mongoose');

const ProductViewSchema = new mongoose.Schema({
  productId: { type: mongoose.Types.ObjectId, ref: 'Product', index: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', default: null },
  ip: String,
  userAgent: String,
  country: String,
  city: String,
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('ProductView', ProductViewSchema);
