
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true, maxlength: 200 },
  slug: { type: String, index: true },
  description: { type: String },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  currency: { type: String, default: 'KSH' },
  images: [{ url: String, alt: String }],
  primaryImage: { url: String, alt: String },
  variants: [{
    sku: { type: String },
    attrs: { type: Object },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    images: [{ url: String, filename: String }]
  }],
  sellerId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  shopId: { type: mongoose.Types.ObjectId, ref: 'Shop' },
  category: { type: String, index: true },
  subcategory: { type: String },
  condition: { type: String, enum: ['new', 'pre-owned'], default: 'new' },
  stockQty: { type: Number, default: 0 },
  unitType: { type: String, default: 'pcs' },
  lowStockThreshold: { type: Number, default: 5 },
  warranty: {
    available: { type: Boolean, default: false },
    durationMonths: { type: Number, default: 0 }
  },
  returnPolicy: {
    accepted: { type: Boolean, default: false },
    durationDays: { type: Number, default: 0 }
  },
  seoTags: [String],
  averageRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'out_of_stock', 'hidden', 'paused', 'deleted'], default: 'active' },
  salesCount: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isSupermarketItem: { type: Boolean, default: false }
});

ProductSchema.index({ slug: 1 });
ProductSchema.index({ shopId: 1 });
ProductSchema.index({ category: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
module.exports = Product;