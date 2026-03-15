const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const slugify = require('../utils/slugify');
const analyticsService = require('../services/analyticsService.js');
// const productActivityWS = require('../ws/productActivity.js'); // Optional if exists

exports.createProduct = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'auth required' });
    const payload = req.body || {};
    const uploaded = req.uploadedFiles || (req.files || []);

    const payloadImages = Array.isArray(payload.images) ? payload.images : [];
    const images = payloadImages.concat(uploaded.map(u => ({ url: u.url || `/uploads/${u.filename}` })));

    const product = new Product({
      title: payload.title || payload.name,
      slug: slugify(payload.slug || payload.title || payload.name),
      description: payload.description,
      price: Number(payload.price) || 0,
      discount: Number(payload.discount) || 0,
      currency: payload.currency || 'KSH',
      images,
      primaryImage: images[0] || null,
      sellerId: user._id,
      shopId: payload.shopId || user.shopId || null,
      category: payload.category || null,
      subcategory: payload.subcategory || null,
      condition: (payload.condition || 'new').toLowerCase(),
      stockQty: Number(payload.stockQty || payload.stock) || 0,
      unitType: payload.unitType || 'pcs',
      lowStockThreshold: Number(payload.lowStockThreshold) || 5,
      warranty: payload.warranty || { available: false, durationMonths: 0 },
      returnPolicy: payload.returnPolicy || { accepted: false, durationDays: 0 },
      status: payload.status || 'active'
    });

    await product.save();
    res.json({ ok: true, product });
  } catch (err) { console.error('createProduct', err); res.status(500).json({ error: 'create product failed' }); }
};

exports.getProduct = async (req, res) => {
  try {
    const id = req.params.productId || req.params.id;
    const p = await Product.findById(id).lean();
    if (!p) return res.status(404).json({ error: 'not found' });

    // Record view
    try {
      if (analyticsService.recordView) analyticsService.recordView({ productId: p._id, ip: req.ip, ua: req.headers['user-agent'] });
    } catch (e) { }

    res.json({ product: p });
  } catch (e) { console.error('getProduct', e); res.status(500).json({ error: 'server error' }); }
};

exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' }).sort({ views: -1 }).limit(10).lean();
    res.json({ ok: true, products });
  } catch (err) { console.error('getFeaturedProducts', err); res.status(500).json({ error: 'failed' }); }
};

exports.getTrendingProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' }).sort({ salesCount: -1 }).limit(10).lean();
    res.json({ ok: true, products });
  } catch (err) { console.error('getTrendingProducts', err); res.status(500).json({ error: 'failed' }); }
};

exports.getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' }).sort({ averageRating: -1 }).limit(10).lean();
    res.json({ ok: true, products });
  } catch (err) { console.error('getRecommendedProducts', err); res.status(500).json({ error: 'failed' }); }
};

exports.listProducts = async (req, res) => {
  try {
    const { q, category, subcategory, page = 1, limit = 24, sellerId } = req.query;
    console.log('[PRODUCTS] listProducts query:', { q, category, subcategory, page, limit, sellerId });

    const filter = {};
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (sellerId) filter.sellerId = sellerId;

    const skip = (page - 1) * limit;
    const products = await Product.find(filter).skip(skip).limit(Number(limit)).lean();
    const total = await Product.countDocuments(filter);

    console.log('[PRODUCTS] Found:', products.length, 'Total:', total);
    res.json({ items: products, total });
  } catch (err) {
    console.error('[PRODUCTS][ERROR] listProducts failed:', err);
    res.status(500).json({ error: 'Failed to list products', detail: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'auth required' });
    const id = req.params.id;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'product not found' });
    if (String(product.sellerId) !== String(user._id) && user.role !== 'admin') return res.status(403).json({ error: 'not authorized' });

    const payload = req.body || {};
    const uploaded = req.uploadedFiles || (req.files || []);

    if (uploaded.length) {
      product.images = (product.images || []).concat(uploaded.map(u => ({ url: u.url || `/uploads/${u.filename}` })));
      if (!product.primaryImage && product.images.length) product.primaryImage = product.images[0];
    }

    ['title', 'description', 'price', 'discount', 'category', 'subcategory', 'condition', 'stockQty', 'unitType', 'lowStockThreshold', 'status'].forEach(f => {
      if (payload[f] !== undefined) {
        if (f === 'condition' && typeof payload[f] === 'string') product[f] = payload[f].toLowerCase();
        else product[f] = payload[f];
      }
    });

    if (payload.slug) product.slug = slugify(payload.slug);
    product.updatedAt = new Date();
    await product.save();
    res.json({ ok: true, product });
  } catch (err) { console.error('updateProduct', err); res.status(500).json({ error: 'update failed' }); }
};

exports.deleteProduct = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'auth required' });
    const id = req.params.id;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'not found' });
    if (String(product.sellerId) !== String(user._id) && user.role !== 'admin') return res.status(403).json({ error: 'not authorized' });
    product.status = 'deleted';
    await product.save();
    res.json({ ok: true });
  } catch (err) { console.error('deleteProduct', err); res.status(500).json({ error: 'delete failed' }); }
};

exports.toggleVisibility = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'auth required' });
    const id = req.params.id;
    const { action } = req.body;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'not found' });
    if (String(product.sellerId) !== String(user._id) && user.role !== 'admin') return res.status(403).json({ error: 'not authorized' });
    if (action === 'hide') product.status = 'hidden';
    else if (action === 'activate') product.status = 'active';
    else if (action === 'pause') product.status = 'paused';
    await product.save();
    res.json({ ok: true, status: product.status });
  } catch (err) { console.error('toggleVisibility', err); res.status(500).json({ error: 'action failed' }); }
};

exports.getShopProducts = async (req, res) => {
  try {
    const { shopId } = req.params;
    const products = await Product.find({ shopId, status: 'active' }).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, products });
  } catch (err) { console.error('getShopProducts', err); res.status(500).json({ error: 'failed' }); }
};

exports.sellerInventory = async (req, res) => {
  try {
    const sellerId = req.user && req.user._id;
    if (!sellerId) return res.status(401).json({ error: 'auth required' });
    const products = await Product.find({ sellerId }).sort({ updatedAt: -1 }).lean();
    res.json({ ok: true, products });
  } catch (err) { console.error('sellerInventory', err); res.status(500).json({ error: 'failed' }); }
};

// Helper exports for others to use
exports.decrementStockForOrder = async (items = [], session = null) => {
  const results = [];
  try {
    for (const it of items) {
      const { productId, qty = 1, price = 0 } = it;
      const updated = await Product.findOneAndUpdate(
        { _id: productId, stockQty: { $gte: qty } },
        { $inc: { stockQty: -qty, salesCount: qty, revenue: price * qty } },
        { new: true, session }
      );
      if (updated) {
        const low = updated.stockQty <= (updated.lowStockThreshold || 5);
        results.push({ productId, updated, low });
        // Log inventory change
        try {
          await InventoryLog.create([{ productId, delta: -qty, reason: 'order_sale', by: null }], { session });
        } catch (le) { console.error('Failed to log inventory for sale', le); }
      } else {
        const set = await Product.findByIdAndUpdate(productId, { $set: { stockQty: 0, status: 'out_of_stock' } }, { new: true, session });
        results.push({ productId, updated: set || null, low: true });
      }
    }
    return results;
  } catch (err) { console.error('decrementStockForOrder', err); throw err; }
};

exports.updateInventoryOnOrder = async (order = {}) => {
  const items = (order.items || []).map(i => ({ productId: i.productId, qty: i.qty || i.quantity || 1, price: i.price || 0 }));
  return await exports.decrementStockForOrder(items);
};