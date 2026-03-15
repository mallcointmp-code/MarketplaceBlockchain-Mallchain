const Cart = require('../models/Cart.js');
const Product = require('../models/Product.js');

// get cart
async function getCart(req, res) {
  try {
    const ownerId = req.user._id;
    let cart = await Cart.findOne({ ownerId });
    if (!cart) {
      cart = new Cart({ ownerId, items: [] });
      await cart.save();
    }
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get cart' });
  }
}

// update cart
async function updateCart(req, res) {
  try {
    const ownerId = req.user._id;
    const { action, productId, qty } = req.body;
    let cart = await Cart.findOne({ ownerId });
    if (!cart) cart = new Cart({ ownerId, items: [] });

    if (action === 'add') {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const found = cart.items.find(i => i.productId && i.productId.toString() === productId.toString());
      if (found) found.qty += qty || 1;
      else {
        cart.items.push({
          productId: product._id,
          title: product.title,
          price: product.price,
          qty: qty || 1,
          sellerId: product.sellerId,
          shopId: product.shopId
        });
      }
    } else if (action === 'remove') {
      cart.items = cart.items.filter(i => i.productId.toString() !== productId.toString());
    } else if (action === 'update') {
      const it = cart.items.find(i => i.productId.toString() === productId.toString());
      if (it) it.qty = qty;
    }

    cart.updatedAt = new Date();
    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cart update failed' });
  }
}

// clear cart
async function clearCart(req, res) {
  try {
    await Cart.deleteOne({ ownerId: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear' });
  }
}

// sync cart (replace items)
async function syncCart(req, res) {
  try {
    const ownerId = req.user._id;
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });

    const normalized = items.map(it => ({
      productId: it.productId || it.id || it._id || null,
      title: it.title || it.name || it.label || '',
      price: Number(it.price || 0),
      qty: Number(it.qty || it.quantity || 1),
      sellerId: it.sellerId || null,
      shopId: it.shopId || null
    }));

    let cart = await Cart.findOne({ ownerId });
    if (!cart) {
      cart = new Cart({ ownerId, items: normalized });
    } else {
      cart.items = normalized;
      cart.updatedAt = new Date();
    }
    await cart.save();
    res.json({ ok: true, cart });
  } catch (err) {
    console.error('syncCart err', err);
    res.status(500).json({ error: 'sync failed' });
  }
}

// CommonJS exports
module.exports = {
  Cart,
  Product,
  getCart,
  updateCart,
  clearCart,
  syncCart
};
