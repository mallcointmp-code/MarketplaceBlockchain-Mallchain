const mongoose = require('mongoose');

const InventoryLogSchema = new mongoose.Schema({
  productId: { type: mongoose.Types.ObjectId, ref: 'Product', required: true, index: true },
  delta: { type: Number, required: true },
  reason: { type: String, default: '' },
  by: { type: mongoose.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryLog', InventoryLogSchema);
