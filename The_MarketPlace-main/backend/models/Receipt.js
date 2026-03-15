const mongoose = require('mongoose');

const ReceiptSchema = new mongoose.Schema({
  orderId: { type: mongoose.Types.ObjectId, ref: 'Order', required: true },
  sellerId: { type: mongoose.Types.ObjectId, ref: 'User' },
  customerId: { type: mongoose.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'KSH' },
  theme: { type: String },
  pdfPath: { type: String },
  theme: { type: Object },
  data: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Receipt', ReceiptSchema);
