const Order = require('../models/Order.js');
const Cart = require('../models/Cart.js');
const Wallet = require('../models/Wallet.js');
const { recordTx } = require('../services/walletService.js');
const { createReceiptForOrder } = require('./receiptController.js');
const productController = require('./productController.js');

function orderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase().slice(2, 9)}`;
}

exports.checkoutMallmoney = async (req, res) => {
  try {
    const user = req.user;
    const { shippingFee = 0, deliveryAddress } = req.body;
    const postedItems = Array.isArray(req.body.items) ? req.body.items : null;
    let cart = null;
    if (!postedItems) cart = await Cart.findOne({ ownerId: user._id });
    const items = postedItems || (cart && cart.items) || [];
    if (!items || !items.length) return res.status(400).json({ error: 'Cart empty' });

    const subtotal = items.reduce((s, it) => s + (it.price * it.qty), 0);
    const total = subtotal + Number(shippingFee || 0);

    const wallet = await Wallet.findOne({ ownerId: user._id });
    if (!wallet || wallet.mallmoney < total) return res.status(400).json({ error: 'Insufficient Mallmoney' });

    wallet.mallmoney -= total;
    await wallet.save();

    await recordTx(wallet._id, { type: 'purchase', amount: total, currency: 'KSH', meta: { items } });

    const order = new Order({
      orderNumber: orderNumber(),
      buyerId: user._id,
      buyerName: user.fullName || user.username || user.name,
      buyerPhone: user.phone,
      buyerEmail: user.email,
      items: items.map(i => ({ ...i })),
      subtotal,
      shippingFee,
      total,
      currency: 'KES',
      paymentMethod: 'mallmoney',
      status: 'paid',
      deliveryAddress
    });
    await order.save();

    if (!postedItems && cart) await Cart.deleteOne({ ownerId: user._id });

    // decrement stock for ordered items and notify sellers if low stock
    try {
      const results = await productController.decrementStockForOrder(order.items || []);
      const io = req.app && req.app.get('io');
      for (const r of results || []) {
        try {
          if (r && r.updated && r.low) {
            // notify seller via socket
            const sid = String(r.updated.sellerId || r.updated.shopId || '');
            if (io && sid) io.to(`user:${sid}`).emit('product:low_stock', { productId: r.productId, stockQty: r.updated.stockQty });
          }
        } catch (e) { console.error('notify low stock', e); }
      }
    } catch (e) { console.error('stock decrement failed', e); }

    try { await createReceiptForOrder({ orderId: order._id, sendEmailToCustomer: true }); } catch (e) { console.error('receipt creation error', e); }

    res.json({ ok: true, order });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Checkout failed' }); }
};

exports.checkoutMallcoins = async (req, res) => {
  try {
    const user = req.user;
    const { shippingFee = 0, deliveryAddress } = req.body;
    const postedItems = Array.isArray(req.body.items) ? req.body.items : null;
    let cart = null;
    if (!postedItems) cart = await Cart.findOne({ ownerId: user._id });
    const items = postedItems || (cart && cart.items) || [];
    if (!items || !items.length) return res.status(400).json({ error: 'Cart empty' });

    const subtotal = items.reduce((s, it) => s + (it.price * it.qty), 0);
    const total = subtotal + Number(shippingFee || 0);

    const wallet = await Wallet.findOne({ ownerId: user._id });
    if (!wallet || wallet.mallcoins < total) return res.status(400).json({ error: 'Insufficient Mallcoins' });

    wallet.mallcoins -= total;
    await wallet.save();

    await recordTx(wallet._id, { type: 'purchase', amount: total, currency: 'Mallcoins', meta: { items } });

    const order = new Order({
      orderNumber: orderNumber(),
      buyerId: user._id,
      buyerName: user.fullName || user.username || user.name,
      buyerPhone: user.phone,
      buyerEmail: user.email,
      items: items.map(i => ({ ...i })),
      subtotal,
      shippingFee,
      total,
      currency: 'Mallcoins',
      paymentMethod: 'mallcoins',
      status: 'paid',
      deliveryAddress
    });
    await order.save();

    if (!postedItems && cart) await Cart.deleteOne({ ownerId: user._id });

    try { await createReceiptForOrder({ orderId: order._id, sendEmailToCustomer: true }); } catch (e) { console.error('receipt creation error', e); }

    res.json({ ok: true, order });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Checkout failed' }); }
};

exports.checkoutSupermarket = async (req, res) => {
  try {
    const user = req.user;
    const { shopId, items, payMethod } = req.body;
    const Shop = req.app.get('models')?.Shop || (await import('../models/Shop.js')).default;
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const subtotal = items.reduce((s, it) => s + (it.price * it.qty), 0);
    const total = subtotal;

    const stkResponse = {
      status: 'pending',
      mpesaRequestId: `STK-${Date.now()}`,
      checkoutUrl: null
    };

    const order = new Order({
      orderNumber: orderNumber(),
      buyerId: user._id,
      buyerName: user.fullName || user.username || user.name,
      buyerPhone: user.phone,
      buyerEmail: user.email,
      items: items.map(i => ({ ...i })),
      subtotal,
      shippingFee: 0,
      total,
      paymentMethod: payMethod || 'mpesa_supermarket',
      paymentMeta: { stkResponse },
      status: 'pending_payment',
      deliveryAddress: req.body.deliveryAddress || ''
    });
    await order.save();

    res.json({ ok: true, order, stkResponse });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Supermarket checkout failed' }); }
};

// confirm payment for supermarket order and decrement stock
exports.confirmSupermarketPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId required' });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'paid') return res.json({ ok: true, order });

    order.status = 'paid';
    await order.save();

    // clear cart if it exists
    try {
      if (order.buyerId) {
        await Cart.deleteOne({ ownerId: order.buyerId });
        console.log(`[checkout] Cart cleared for buyer ${order.buyerId} after supermarket payment`);
      }
    } catch (ce) { console.error('Failed to clear cart after supermarket payment', ce); }

    // decrement stock using product controller helper
    try {
      const results = await productController.decrementStockForOrder(order.items || []);
      const io = req.app && req.app.get('io');
      for (const r of results || []) {
        try {
          if (r && r.updated && r.low) {
            const sid = String(r.updated.sellerId || r.updated.shopId || '');
            if (io && sid) io.to(`user:${sid}`).emit('product:low_stock', { productId: r.productId, stockQty: r.updated.stockQty });
          }
        } catch (e) { console.error('notify low stock', e); }
      }
    } catch (e) { console.error('stock decrement failed', e); }

    res.json({ ok: true, order });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Confirm payment failed' }); }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

module.exports = {
  checkoutMallmoney: exports.checkoutMallmoney,
  checkoutMallcoins: exports.checkoutMallcoins,
  checkoutSupermarket: exports.checkoutSupermarket,
  confirmSupermarketPayment: exports.confirmSupermarketPayment,
  getOrder: exports.getOrder
};