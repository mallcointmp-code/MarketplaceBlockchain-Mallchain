
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const slugify = require('../utils/slugify');

exports.createShop = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'auth required' });
    const { name, description, location, phone, coverImage, isSupermarket } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    // generate unique slug
    let base = slugify(name || 'shop');
    let slug = base;
    let count = 0;
    while (await Shop.findOne({ slug })) {
      count += 1;
      slug = `${base}-${count}`;
    }

    const shop = new Shop({ ownerId: user._id, name, slug, description: description || '', location: location || {}, phone: phone || '', coverImage: coverImage || '', isSupermarket: !!isSupermarket });
    await shop.save();
    try { await AuditLog.create({ user: user._id, action: 'shop.create', details: { shopId: shop._id } }); } catch (e) { /* best-effort */ }
    res.json({ ok: true, shop });
  } catch (err) { console.error('createShop', err); res.status(500).json({ error: 'create shop failed' }); }
};

exports.payShopRent = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'auth required' });
    const { shopId, months = 1 } = req.body;
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ error: 'shop not found' });
    if (String(shop.ownerId) !== String(user._id)) return res.status(403).json({ error: 'not your shop' });

    const now = new Date();
    const newUntil = shop.monthlyRentPaidUntil && shop.monthlyRentPaidUntil > now ? new Date(shop.monthlyRentPaidUntil) : now;
    newUntil.setMonth(newUntil.getMonth() + Number(months));
    shop.monthlyRentPaidUntil = newUntil;
    await shop.save();
    try { await AuditLog.create({ user: user._id, action: 'shop.pay_rent', details: { shopId, months } }); } catch (e) { }
    res.json({ ok: true, shop, until: newUntil });
  } catch (err) { console.error('payShopRent', err); res.status(500).json({ error: 'pay rent failed' }); }
};

exports.listShopProducts = async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const products = await Product.find({ shopId }).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, products });
  } catch (err) { console.error('listShopProducts', err); res.status(500).json({ error: 'list shop products failed' }); }
};

// List shops with optional category/subcategory filters
exports.listShops = async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    const filter = {};
    if (category || subcategory) {
      // Shop model stores `categories: [String]` — match any element that contains category or subcategory (case-insensitive)
      const or = [];
      if (category) or.push({ categories: { $elemMatch: { $regex: new RegExp(category, 'i') } } });
      if (subcategory) or.push({ categories: { $elemMatch: { $regex: new RegExp(subcategory, 'i') } } });
      if (or.length) filter.$or = or;
    }
    const shops = await require('../models/Shop').find(filter).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, shops });
  } catch (err) { console.error('listShops', err); res.status(500).json({ error: 'failed to list shops' }); }
};

module.exports = exports;
