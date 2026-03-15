
const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, index: true },
  description: { type: String, default: '' },
  shopFrontImages: [{ url: String }],
  address: String,
  location: { lat: Number, lng: Number },
  categories: [String],
  monthlyRentKsh: { type: Number, default: 0 },
  rentPaidUntil: Date,
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Shop', ShopSchema);
