const ProductView = require('../models/ProductView');
const ProductOrderStats = require('../models/ProductOrderStats');
const CartActivity = require('../models/CartActivity');
const SearchLog = require('../models/SearchLog');
const ProductAnalytics = require('../models/ProductAnalytics');
const Product = require('../models/Product');

const analyticsService = {
  async recordView({ productId, userId = null, ip = null, ua = null, geo = {} }) {
    try {
      await ProductView.create({ productId, userId, ip, userAgent: ua, country: geo.country, city: geo.city });
      await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });
      await ProductAnalytics.findOneAndUpdate({ productId }, { $inc: { views: 1 }, $set: { lastUpdated: new Date() } }, { upsert: true });
    } catch (e) { console.error('analytics.recordView', e); }
  },

  async recordCart({ productId, userId = null, action = 'add', qty = 1 }) {
    try {
      await CartActivity.create({ productId, userId, action, qty });
      const field = action === 'add' ? 'addsToCart' : 'addsToCart';
      await ProductAnalytics.findOneAndUpdate({ productId }, { $inc: { [field]: 1 }, $set: { lastUpdated: new Date() } }, { upsert: true });
    } catch (e) { console.error('analytics.recordCart', e); }
  },

  async recordPurchase({ productId, orderId, sellerId, qty = 1, price = 0 }) {
    try {
      await ProductOrderStats.create({ productId, orderId, sellerId, qty, price });
      await ProductAnalytics.findOneAndUpdate({ productId }, { $inc: { purchases: qty, revenue: price * qty }, $set: { lastUpdated: new Date() } }, { upsert: true });
      await Product.findByIdAndUpdate(productId, { $inc: { salesCount: qty, revenue: price * qty } });
    } catch (e) { console.error('analytics.recordPurchase', e); }
  },

  async getSellerSummary(sellerId) {
    // aggregate main cards
    const products = await Product.find({ sellerId }).lean();
    const productIds = products.map(p=>p._id);
    const analytics = await ProductAnalytics.find({ productId: { $in: productIds } }).lean();

    const totalRevenue = analytics.reduce((s,a)=>s + (a.revenue||0), 0);
    const totalUnits = analytics.reduce((s,a)=>s + (a.purchases||0), 0);
    const totalViews = analytics.reduce((s,a)=>s + (a.views||0), 0);
    const topProductId = analytics.sort((a,b)=> (b.revenue||0)-(a.revenue||0))[0]?.productId || null;

    return { totalRevenue, totalUnits, totalViews, topProductId };
  },

  async getProductAnalytics(productId) {
    const analytics = await ProductAnalytics.findOne({ productId }).lean();
    return analytics || { views:0, addsToCart:0, purchases:0, revenue:0 };
  }
};

module.exports = analyticsService;
