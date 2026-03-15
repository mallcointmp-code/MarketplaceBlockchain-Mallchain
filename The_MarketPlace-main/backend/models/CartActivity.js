const mongoose = require('mongoose');

const CartActivitySchema = new mongoose.Schema({
  productId: { type: mongoose.Types.ObjectId, ref: 'Product', index: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, enum: ['add', 'remove'], required: true },
  qty: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('CartActivity', CartActivitySchema);

module.exports = { mongoose, CartActivitySchema };