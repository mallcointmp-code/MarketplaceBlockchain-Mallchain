const mongoose = require('mongoose');

const CartItem = new mongoose.Schema({
  productId: { type: mongoose.Types.ObjectId, ref: 'Product' },
  title: String,
  price: Number,
  qty: { type: Number, default: 1 },
  sellerId: { type: mongoose.Types.ObjectId, ref: 'User' },
  shopId: { type: mongoose.Types.ObjectId, ref: 'Shop' }
}, { _id: false });

const CartSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Types.ObjectId, ref: 'User', index: true },
  items: [CartItem],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Cart || mongoose.model('Cart', CartSchema);

// module.exports = { mongoose, CartItem, CartSchema };