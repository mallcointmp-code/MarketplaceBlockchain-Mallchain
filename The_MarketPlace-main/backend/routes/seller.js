// backend/routes/seller.js
const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');

const Product = require('../models/Product');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const { authMiddleware } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const sellerCtrl = require('../controllers/sellerController');
const asyncHandler = require('../utils/asyncHandler');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

// --------------------
// Legacy / quick endpoints
// --------------------
router.post('/products/create', authMiddleware, asyncHandler(async (req, res) => {
  const { title, description, price, stock, images, category } = req.body;
  const product = new Product({ seller: req.user.userId, title, description, price, stock, images, category });
  await product.save();
  res.json({ message: '✅ Product created successfully', product });
}));

router.get('/products/my', authMiddleware, asyncHandler(async (req, res) => {
  const products = await Product.find({ sellerId: req.user.userId });
  res.json(products);
}));

router.get('/orders/my', authMiddleware, asyncHandler(async (req, res) => {
  const orders = await Order.find({ sellerId: req.user.userId }).populate('buyer', 'name email');
  res.json(orders);
}));

router.post('/orders/ready/:orderId', authMiddleware, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order || order.sellerId.toString() !== req.user.userId)
    return res.status(404).json({ error: 'Order not found or not yours' });

  const delivery = new Delivery({
    order: order._id,
    status: 'pending',
    trackingUpdates: [{ status: 'Seller marked order ready for shipment' }]
  });
  await delivery.save();
  res.json({ message: '🚚 Order marked ready for delivery', delivery });
}));

// --------------------
// New / full-featured endpoints
// --------------------
router.post('/shop', authMiddleware, roleMiddleware(['seller', 'admin']), asyncHandler(sellerCtrl.createShop));
router.post('/shop/pay-rent', authMiddleware, roleMiddleware(['seller', 'admin']), asyncHandler(sellerCtrl.payShopRent));

// List seller products with pagination & search
router.get('/products', authMiddleware, roleMiddleware(['seller', 'admin']), [
  query('page').optional().toInt(),
  query('limit').optional().toInt(),
  query('q').optional().trim()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = req.user && (req.user._id || req.user.userId);
  if (!userId) return res.status(401).json({ error: 'auth required' });

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const q = req.query.q || '';

  const filter = { sellerId: userId };
  if (q) filter.$or = [
    { title: { $regex: q, $options: 'i' } },
    { description: { $regex: q, $options: 'i' } }
  ];

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter).skip((page - 1) * limit).limit(limit).lean();
  res.json({ products, total, page, limit });
}));

// CRUD for products
router.post('/products', authMiddleware, roleMiddleware(['seller', 'admin']), uploadMiddleware.uploadHandler, [
  body('name').notEmpty().withMessage('name required'),
  body('price').isFloat({ gt: 0 }).withMessage('price must be > 0'),
  body('totalUnits').isInt({ gt: 0 }).withMessage('totalUnits must be int > 0')
], asyncHandler(sellerCtrl.addProduct));

router.put('/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), uploadMiddleware.uploadHandler, [
  body('price').optional().isFloat({ gt: 0 }).withMessage('price must be > 0'),
  body('totalUnits').optional().isInt({ gt: 0 }).withMessage('totalUnits must be int > 0')
], asyncHandler(sellerCtrl.updateProduct));

router.delete('/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), asyncHandler(sellerCtrl.deleteProduct));

// Change stock
router.post('/product/stock', authMiddleware, roleMiddleware(['seller', 'admin']), [
  body('productId').notEmpty().withMessage('productId required')
], asyncHandler(sellerCtrl.changeStock));

// Dashboards
router.get('/dashboard', authMiddleware, roleMiddleware(['seller', 'admin']), asyncHandler(sellerCtrl.sellerDashboard));
router.get('/dashboard/v2', authMiddleware, roleMiddleware(['seller', 'admin']), asyncHandler(sellerCtrl.sellerDashboardV2));
router.get('/inventory/analytics', authMiddleware, roleMiddleware(['seller', 'admin']), asyncHandler(sellerCtrl.inventoryAnalytics));
router.get('/inventory/logs', authMiddleware, roleMiddleware(['seller', 'admin']), asyncHandler(sellerCtrl.getInventoryLogs));

/**
 * @route   GET /api/seller/stats
 * @desc    Get seller statistics (sales, orders, products)
 * @access  Private (seller only)
 */
router.get('/stats', authMiddleware, roleMiddleware(['seller', 'admin']), asyncHandler(async (req, res) => {
  const userId = req.user && (req.user._id || req.user.userId);
  if (!userId) return res.status(401).json({ error: 'auth required' });

  try {
    // Get seller's products
    const products = await Product.find({ sellerId: userId });

    // Get seller's orders
    const orders = await Order.find({ sellerId: userId });

    // Calculate total sales
    const totalSales = orders.reduce((sum, order) => {
      return sum + (order.total || order.amount || 0);
    }, 0);

    // Calculate pending orders
    const pendingOrders = orders.filter(o =>
      o.status === 'pending' || o.status === 'processing'
    ).length;

    res.json({
      totalSales,
      totalOrders: orders.length,
      pendingOrders,
      totalProducts: products.length,
      activeProducts: products.filter(p => p.stock > 0 || p.remaining > 0).length
    });
  } catch (error) {
    console.error('Seller stats error:', error);
    // Return default values on error
    res.json({
      totalSales: 0,
      totalOrders: 0,
      pendingOrders: 0,
      totalProducts: 0,
      activeProducts: 0
    });
  }
}));

router.get('/orders', authMiddleware, roleMiddleware(['seller', 'admin']), asyncHandler(sellerCtrl.listSellerOrders));
router.put('/orders/:orderId/status', authMiddleware, roleMiddleware(['seller', 'admin']), asyncHandler(sellerCtrl.updateSellerOrderStatus));

module.exports = router;

