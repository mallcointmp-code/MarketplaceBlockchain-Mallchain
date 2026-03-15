
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Types.ObjectId, ref: 'Product' },
  title: String,
  price: Number,
  qty: Number,
  sellerId: { type: mongoose.Types.ObjectId, ref: 'User' },
  shopId: { type: mongoose.Types.ObjectId, ref: 'Shop' }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, index: true },
  buyerId: { type: mongoose.Types.ObjectId, ref: 'User' },
  buyerName: String,
  buyerPhone: String,
  buyerEmail: String,
  items: [OrderItemSchema],
  subtotal: Number,
  shippingFee: Number,
  total: Number,
  currency: { type: String, default: 'KSH' },
  status: {
    type: String,
    enum: ['pending_payment', 'paid', 'packed', 'assigned', 'in_transit', 'delivered', 'cancelled', 'refunded'],
    default: 'pending_payment'
  },
  paymentMethod: String,
  paymentMeta: Object,
  createdAt: { type: Date, default: Date.now },
  deliveryAddress: String,
  assignedDeliveryId: { type: mongoose.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Order', OrderSchema);

