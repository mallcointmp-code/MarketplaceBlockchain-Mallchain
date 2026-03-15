
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const Wallet = require('../models/Wallet');
const Order = require('../models/Order');
const slugify = require('../utils/slugify');
const AuditLog = require('../models/AuditLog');
const monitoring = require('../utils/monitoring.js');

exports.createShop = async (req, res) => {
  try {
    const ownerId = req.user && req.user._id;
    if (!ownerId) return res.status(401).json({ error: 'auth required' });
    const { name, description, address, lat, lng, categories } = req.body;
    const shop = new Shop({ ownerId, name, slug: slugify(name), description: description || '', address: address || '', location: lat && lng ? { lat, lng } : undefined, categories: categories || [] });
    await shop.save();
    try { await AuditLog.create({ user: ownerId, action: 'shop.create', details: { shopId: shop._id } }); } catch (e) { }
    res.json({ ok: true, shop });
  } catch (err) { console.error('createShop', err); res.status(500).json({ error: 'failed to create shop' }); }
};

exports.payShopRent = async (req, res) => {
  try {
    const ownerId = req.user && req.user._id;
    if (!ownerId) return res.status(401).json({ error: 'auth required' });
    const { shopId, method, months = 1 } = req.body;
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ error: 'shop not found' });
    const amount = (shop.monthlyRentKsh || 0) * Number(months);
    if (method === 'mallmoney') {
      const wallet = await Wallet.findOne({ ownerId });
      if (!wallet || (wallet.mallmoney || 0) < amount) return res.status(400).json({ error: 'insufficient mallmoney' });
      wallet.mallmoney -= amount; await wallet.save();
    } else {
      // placeholder: trigger external payment flow
    }
    const now = new Date();
    const newUntil = shop.rentPaidUntil && shop.rentPaidUntil > now ? new Date(shop.rentPaidUntil) : now;
    newUntil.setMonth(newUntil.getMonth() + Number(months));
    shop.rentPaidUntil = newUntil;
    await shop.save();
    try { await AuditLog.create({ user: ownerId, action: 'shop.pay_rent', details: { shopId, months, amount } }); } catch (e) { }
    res.json({ ok: true, shop, until: newUntil });
  } catch (err) { console.error('payShopRent', err); res.status(500).json({ error: 'failed to pay rent' }); }
};

exports.addProduct = async (req, res) => {
  try {
    const sellerId = req.user && req.user._id;
    if (!sellerId) return res.status(401).json({ error: 'auth required' });

    // Payload may be sent as multipart FormData with a `data` JSON field
    let payload = {};
    if (req.body && req.body.data) {
      try { payload = JSON.parse(req.body.data); } catch (e) { payload = req.body; }
    } else {
      payload = req.body || {};
    }

    const { shopId, name, title, description, priceKsh, price, category, stock = 0, sku, condition, variants = [], variantOptions = [] } = payload;

    const product = new Product({
      shopId,
      sellerId,
      title: title || name || payload.name || 'Untitled',
      description: description || '',
      price: Number(priceKsh || price || 0),
      category,
      stockQty: Number(stock || payload.stockQty || 0),
      sku,
      condition: (condition || 'new').toLowerCase(),
      variantOptions: variantOptions || [],
      variants: Array.isArray(variants) ? variants.map(v => ({ sku: v.sku, attrs: v.attrs || v.attributes || {}, price: Number(v.price || 0), stockQty: Number(v.stock || v.stockQty || 0), images: Array.isArray(v.images) ? v.images.slice() : [] })) : []
    });

    // Map uploaded files (middleware provides req.uploadedFiles with `fieldname` and `url`)
    if (req.uploadedFiles && Array.isArray(req.uploadedFiles) && req.uploadedFiles.length) {
      const filesByField = {};
      for (const f of req.uploadedFiles) {
        const key = f.fieldname || 'images';
        filesByField[key] = filesByField[key] || [];
        filesByField[key].push(f);
      }

      // Product-level images usually come in field `images` or `productImages`
      const productFields = ['images', 'productImages', 'product_image', 'product_images'];
      for (const pf of productFields) {
        if (filesByField[pf] && filesByField[pf].length) {
          product.images = (product.images || []).concat(filesByField[pf].map(f => ({ url: f.url || f.path || f.filename, alt: '' })));
        }
      }

      // Variant files: fieldname convention `variant_<id>` or `variantImage_<id>` or `variant-<id>`
      Object.keys(filesByField).forEach(field => {
        if (productFields.includes(field)) return;
        const m = field.match(/variant[_-]?(.*)/i);
        if (m && m[1]) {
          const ident = m[1];
          // try to find variant by id or sku
          const target = product.variants.find(v => String(v.id || v._id || v.sku) === String(ident) || String(v.sku) === String(ident));
          if (target) {
            target.images = target.images || [];
            target.images = target.images.concat(filesByField[field].map(f => ({ url: f.url || f.path || f.filename, alt: '' })));
          } else {
            // if not found by id, try numeric index
            const idx = parseInt(ident);
            if (!isNaN(idx) && product.variants[idx]) {
              product.variants[idx].images = product.variants[idx].images || [];
              product.variants[idx].images = product.variants[idx].images.concat(filesByField[field].map(f => ({ url: f.url || f.path || f.filename, alt: '' })));
            }
          }
        }
      });

      // If no explicit product field matched but there are files in `images` key, attach them
      if ((!product.images || product.images.length === 0) && filesByField['images'] && filesByField['images'].length) {
        product.images = filesByField['images'].map(f => ({ url: f.url || f.path || f.filename, alt: '' }));
      }

      product.primaryImage = (product.images && product.images[0]) ? product.images[0] : (product.primaryImage || null);
    }

    await product.save();
    monitoring.productsCreated.inc(); // Track product growth
    await InventoryLog.create({ productId: product._id, delta: Number(stock || payload.stockQty || 0), reason: 'initial_stock', by: sellerId });
    try { await AuditLog.create({ user: sellerId, action: 'product.create', details: { productId: product._id } }); } catch (e) { }
    res.json({ ok: true, product });
  } catch (err) { console.error('addProduct', err); res.status(500).json({ error: 'failed to add product' }); }
};

exports.updateProduct = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.userId);
    if (!userId) return res.status(401).json({ error: 'auth required' });
    const productId = req.params.id || req.body.productId;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'product not found' });
    if (String(product.sellerId) !== String(userId) && req.user.role !== 'admin') return res.status(403).json({ error: 'not authorized' });

    // Parse payload (support multipart with `data` JSON)
    let payload = {};
    if (req.body && req.body.data) {
      try { payload = JSON.parse(req.body.data); } catch (e) { payload = req.body; }
    } else payload = req.body || {};

    // Apply simple scalar updates
    const mapKeys = ['name', 'title', 'description', 'priceKsh', 'price', 'category', 'condition', 'stock', 'stockQty', 'sku', 'status'];
    mapKeys.forEach(k => {
      if (payload[k] !== undefined) {
        if (k === 'name' || k === 'title') product.title = payload[k];
        else if (k === 'priceKsh') product.price = Number(payload[k] || 0);
        else if (k === 'stock' || k === 'stockQty') {
          const oldStock = product.stockQty || 0;
          const newStock = Number(payload[k]);
          const diff = newStock - oldStock;
          product.stockQty = newStock;
          if (diff !== 0) InventoryLog.create({ productId: product._id, delta: diff, reason: 'manual_update', by: userId }).catch(e => { });
        }
        else if (k === 'condition' && typeof payload[k] === 'string') product[k] = payload[k].toLowerCase();
        else product[k] = payload[k];
      }
    });

    // Handle variant updates if provided
    if (Array.isArray(payload.variants)) {
      // merge variants by id or replace
      for (const v of payload.variants) {
        if (v.id || v._id) {
          const ex = product.variants.find(x => String(x.id || x._id) === String(v.id || v._id));
          if (ex) Object.assign(ex, { sku: v.sku, attrs: v.attrs || v.attributes || ex.attrs, price: Number(v.price || ex.price || 0), stockQty: Number(v.stock || v.stockQty || ex.stockQty || 0) });
          else product.variants.push({ sku: v.sku, attrs: v.attrs || v.attributes || {}, price: Number(v.price || 0), stockQty: Number(v.stock || v.stockQty || 0), images: Array.isArray(v.images) ? v.images.slice() : [] });
        } else if (v.sku) {
          const ex = product.variants.find(x => String(x.sku) === String(v.sku));
          if (ex) Object.assign(ex, { sku: v.sku, attrs: v.attrs || v.attributes || ex.attrs, price: Number(v.price || ex.price || 0), stockQty: Number(v.stock || v.stockQty || ex.stockQty || 0) });
          else product.variants.push({ sku: v.sku, attrs: v.attrs || {}, price: Number(v.price || 0), stockQty: Number(v.stock || v.stockQty || 0), images: Array.isArray(v.images) ? v.images.slice() : [] });
        }
      }
    }

    // Map uploaded files into product / variant images similarly to addProduct
    if (req.uploadedFiles && Array.isArray(req.uploadedFiles) && req.uploadedFiles.length) {
      const filesByField = {};
      for (const f of req.uploadedFiles) {
        const key = f.fieldname || 'images';
        filesByField[key] = filesByField[key] || [];
        filesByField[key].push(f);
      }

      const productFields = ['images', 'productImages', 'product_image', 'product_images'];
      for (const pf of productFields) {
        if (filesByField[pf] && filesByField[pf].length) {
          const imgs = filesByField[pf].map(f => ({ url: f.url || f.path || f.filename, alt: '' }));
          product.images = imgs.concat(product.images || []);
          product.primaryImage = product.primaryImage || imgs[0] || null;
        }
      }

      Object.keys(filesByField).forEach(field => {
        if (productFields.includes(field)) return;
        const m = field.match(/variant[_-]?(.*)/i);
        if (m && m[1]) {
          const ident = m[1];
          const target = product.variants.find(v => String(v.id || v._id || v.sku) === String(ident) || String(v.sku) === String(ident));
          if (target) {
            target.images = target.images || [];
            target.images = target.images.concat(filesByField[field].map(f => ({ url: f.url || f.path || f.filename, alt: '' })));
          } else {
            const idx = parseInt(ident);
            if (!isNaN(idx) && product.variants[idx]) {
              product.variants[idx].images = product.variants[idx].images || [];
              product.variants[idx].images = product.variants[idx].images.concat(filesByField[field].map(f => ({ url: f.url || f.path || f.filename, alt: '' })));
            }
          }
        }
      });
    }

    product.updatedAt = new Date();
    await product.save();
    try { await AuditLog.create({ user: userId, action: 'product.update', details: { productId: product._id } }); } catch (e) { }
    res.json({ ok: true, product });
  } catch (err) { console.error('updateProduct', err); res.status(500).json({ error: 'failed to update product' }); }
};

exports.deleteProduct = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.userId);
    if (!userId) return res.status(401).json({ error: 'auth required' });
    const productId = req.params.id || req.body.productId;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'product not found' });
    if (String(product.sellerId) !== String(userId) && req.user.role !== 'admin') return res.status(403).json({ error: 'not authorized' });
    // soft delete
    product.status = 'deleted';
    product.updatedAt = new Date();
    await product.save();
    try { await AuditLog.create({ user: userId, action: 'product.delete', details: { productId: product._id } }); } catch (e) { }
    res.json({ ok: true });
  } catch (err) { console.error('deleteProduct', err); res.status(500).json({ error: 'failed to delete product' }); }
};

exports.changeStock = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ error: 'auth required' });
    const { productId, delta, reason } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'product not found' });
    // ensure requestor is seller or admin
    if (String(product.sellerId) !== String(userId) && req.user.role !== 'admin') return res.status(403).json({ error: 'not authorized' });
    const deltaVal = Number(delta);
    const newStock = Math.max(0, (product.stockQty || 0) + deltaVal);
    product.stockQty = newStock;
    if (deltaVal < 0) product.salesCount = (product.salesCount || 0) + Math.abs(deltaVal);
    await product.save();
    await InventoryLog.create({ productId, delta: deltaVal, reason: reason || 'manual', by: userId });
    try { await AuditLog.create({ user: userId, action: 'product.change_stock', details: { productId, delta: deltaVal } }); } catch (e) { }
    res.json({ ok: true, product });
  } catch (err) { console.error('changeStock', err); res.status(500).json({ error: 'failed' }); }
};

exports.sellerDashboard = async (req, res) => {
  try {
    const sellerId = req.user && req.user._id;
    if (!sellerId) return res.status(401).json({ error: 'auth required' });
    const shops = await Shop.find({ ownerId: sellerId }).lean();
    const shopIds = shops.map(s => s._id);
    const products = await Product.find({ shopId: { $in: shopIds } }).limit(200).lean();
    const orders = await Order.find({ 'items.sellerId': sellerId }).sort({ createdAt: -1 }).limit(100).lean();
    const totalSales = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    res.json({ shops, products, orders, totalSales });
  } catch (err) { console.error('sellerDashboard', err); res.status(500).json({ error: 'failed' }); }
};

// inventory analytics: sales by month, top products, low stock count
exports.inventoryAnalytics = async (req, res) => {
  try {
    const sellerId = req.user && req.user._id;
    if (!sellerId) return res.status(401).json({ error: 'auth required' });

    const months = Number(req.query.months || 6);
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);

    // sales by month (aggregate orders -> unwind items -> match sellerId)
    const salesPipeline = [
      { $match: { status: { $in: ['paid', 'delivered', 'packed', 'assigned', 'in_transit'] }, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': sellerId } },
      { $project: { yearMonth: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $multiply: ['$items.price', '$items.qty'] }, qty: '$items.qty', productId: '$items.productId', title: '$items.title' } },
      { $group: { _id: '$yearMonth', revenue: { $sum: '$revenue' }, qty: { $sum: '$qty' } } },
      { $sort: { _id: 1 } }
    ];
    const salesByMonth = await require('../models/Order').aggregate(salesPipeline);

    // top products (by qty and revenue)
    const topPipeline = [
      { $match: { status: { $in: ['paid', 'delivered', 'packed', 'assigned', 'in_transit'] } } },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': sellerId } },
      { $group: { _id: '$items.productId', title: { $first: '$items.title' }, totalQty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { totalQty: -1 } },
      { $limit: 10 }
    ];
    const topProducts = await require('../models/Order').aggregate(topPipeline);

    // low stock count
    const lowStockCount = await Product.countDocuments({ sellerId, $expr: { $lte: ['$stockQty', { $ifNull: ['$lowStockThreshold', 5] }] } });

    res.json({ ok: true, salesByMonth, topProducts, lowStockCount });
  } catch (err) { console.error('inventoryAnalytics', err); res.status(500).json({ error: 'failed' }); }
};

exports.getInventoryLogs = async (req, res) => {
  try {
    const sellerId = req.user && (req.user._id || req.user.userId);
    if (!sellerId) return res.status(401).json({ error: 'auth required' });

    const { productId, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (productId) filter.productId = productId;
    else {
      // If no productId, get logs for all products of this seller
      const myProds = await Product.find({ sellerId }).select('_id').lean();
      filter.productId = { $in: myProds.map(p => p._id) };
    }

    const skip = (page - 1) * limit;
    const logs = await InventoryLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('productId', 'title primaryImage')
      .lean();

    const total = await InventoryLog.countDocuments(filter);
    res.json({ ok: true, logs, total, page, limit });
  } catch (err) {
    console.error('getInventoryLogs', err);
    res.status(500).json({ error: 'failed to fetch inventory logs' });
  }
};

// v2 dashboard: return a `stats` object expected by the frontend dashboard components
exports.sellerDashboardV2 = async (req, res) => {
  try {
    const sellerId = req.user && (req.user._id || req.user.userId);
    if (!sellerId) return res.status(401).json({ error: 'auth required' });

    // Basic context
    const shops = await Shop.find({ ownerId: sellerId }).lean();
    const shopIds = shops.map(s => s._id);

    // Recent products and orders for compatibility (same as existing handler)
    const products = await Product.find({ shopId: { $in: shopIds } }).limit(200).lean();
    const recentOrders = await Order.find({ 'items.sellerId': sellerId }).sort({ createdAt: -1 }).limit(100).lean();

    // Time windows
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const prev30Start = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
    const prev30End = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Helper for safe percent change
    const pctChange = (current, previous) => {
      if (!previous || previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    // Aggregation: revenue, qty and orderCount for a date range
    const buildAggregation = (since, until) => {
      const match = { status: { $in: ['paid', 'delivered', 'packed', 'assigned', 'in_transit'] } };
      if (since) match.createdAt = { $gte: since };
      if (until) match.createdAt = Object.assign(match.createdAt || {}, { $lt: until });

      return Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': sellerId } },
        { $group: { _id: '$_id', revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }, qty: { $sum: '$items.qty' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$revenue' }, totalQty: { $sum: '$qty' }, orderCount: { $sum: 1 } } }
      ]).then(r => (r && r[0]) ? r[0] : { totalRevenue: 0, totalQty: 0, orderCount: 0 });
    };

    const last30Agg = await buildAggregation(last30, null);
    const prev30Agg = await buildAggregation(prev30Start, prev30End);

    // Sales today
    const todayAgg = await buildAggregation(startOfToday, null);

    // Category stats (last 30 days)
    const categoryPipeline = [
      { $match: { status: { $in: ['paid', 'delivered', 'packed', 'assigned', 'in_transit'] }, createdAt: { $gte: last30 } } },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': sellerId } },
      { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'prod' } },
      { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$prod.category', revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }, qty: { $sum: '$items.qty' } } },
      { $sort: { revenue: -1 } }
    ];
    const categoryStats = await Order.aggregate(categoryPipeline);

    // Customer habits series (last 14 days) - orders per day
    const days = 14;
    const seriesSince = new Date(now.getTime() - (days - 1) * 24 * 3600 * 1000);
    const habitsPipeline = [
      { $match: { status: { $in: ['paid', 'delivered', 'packed', 'assigned', 'in_transit'] }, createdAt: { $gte: seriesSince } } },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': sellerId } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ];
    const habits = await Order.aggregate(habitsPipeline);
    // normalize series for each day
    const habitsMap = new Map(habits.map(h => [h._id, h.orders]));
    const customerHabitsSeries = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      customerHabitsSeries.push({ date: key, orders: habitsMap.get(key) || 0 });
    }

    // Customer growth by region (best-effort using order shipping address or buyer metadata)
    const regionPipeline = [
      { $match: { status: { $in: ['paid', 'delivered', 'packed', 'assigned', 'in_transit'] } } },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': sellerId } },
      { $group: { _id: '$shippingAddress.region', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ];
    let customerGrowthByRegion = [];
    try { customerGrowthByRegion = await Order.aggregate(regionPipeline); } catch (e) { customerGrowthByRegion = []; }

    const stats = {
      totalSales: last30Agg.totalRevenue || 0,
      totalSalesChange: Math.round(pctChange(last30Agg.totalRevenue, prev30Agg.totalRevenue) * 100) / 100,
      totalOrders: last30Agg.orderCount || 0,
      totalOrdersChange: Math.round(pctChange(last30Agg.orderCount, prev30Agg.orderCount) * 100) / 100,
      visitors: Array.from(new Set((await Order.find({ 'items.sellerId': sellerId, createdAt: { $gte: last30 } }).select('buyer').lean()).map(o => String(o.buyer || '')))).filter(Boolean).length,
      visitorsChange: 0,
      totalSoldProducts: last30Agg.totalQty || 0,
      totalSoldProductsChange: Math.round(pctChange(last30Agg.totalQty, prev30Agg.totalQty) * 100) / 100,

      productSalesToday: todayAgg.totalRevenue || 0,
      productSalesTodayChange: Math.round(pctChange(todayAgg.totalRevenue, prev30Agg.totalRevenue / 30) * 100) / 100,

      categoryStats: categoryStats.map(c => ({ category: c._id || 'Uncategorized', revenue: c.revenue || 0, qty: c.qty || 0 })),

      customerHabitsSummary: { periodDays: days, totalOrders: customerHabitsSeries.reduce((s, p) => s + p.orders, 0) },
      customerHabitsSeries,

      customerGrowthByRegion: customerGrowthByRegion.map(r => ({ region: r._id || 'Unknown', count: r.count }))
    };

    res.json({ stats, shops, products, recentOrders });
  } catch (err) {
    console.error('sellerDashboardV2', err);
    res.status(500).json({ error: 'failed' });
  }
};

exports.listSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user && (req.user._id || req.user.userId);
    if (!sellerId) return res.status(401).json({ error: 'auth required' });

    const orders = await Order.find({ 'items.sellerId': sellerId })
      .sort({ createdAt: -1 })
      .populate('buyerId', 'username fullName avatar');

    // We might want to filter the items to only show the ones belonging to this seller
    // but usually, a seller needs to see the whole order if they are part of it, 
    // or at least their items. For now, let's return the whole order but with context.

    res.json({ success: true, orders });
  } catch (err) {
    console.error('listSellerOrders error:', err);
    res.status(500).json({ error: 'Failed to list orders' });
  }
};

exports.updateSellerOrderStatus = async (req, res) => {
  try {
    const sellerId = req.user && (req.user._id || req.user.userId);
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Check if this seller has items in this order
    const hasItems = order.items.some(item => String(item.sellerId) === String(sellerId));
    if (!hasItems && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this order' });
    }

    order.status = status;
    await order.save();

    // If order is newly paid/processed, we can track it as growth
    if (status === 'paid' || status === 'packed') {
      monitoring.ordersCreated.inc();
    }

    try {
      await AuditLog.create({
        user: sellerId,
        action: 'order.update_status',
        details: { orderId, status }
      });
    } catch (e) { }

    res.json({ success: true, order });
  } catch (err) {
    console.error('updateSellerOrderStatus error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};
