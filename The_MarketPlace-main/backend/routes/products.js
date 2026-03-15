const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productController');
const uploadModule = require('../middlewares/uploadMiddleware');
const uploadHandler = uploadModule && (uploadModule.uploadHandler || (uploadModule.default && uploadModule.default.uploadHandler));
const { authMiddleware } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// public
router.get('/', ctrl.listProducts);
router.get('/featured', ctrl.getFeaturedProducts);
router.get('/trending', ctrl.getTrendingProducts);
router.get('/recommended', ctrl.getRecommendedProducts);
router.get('/shop/:shopId', ctrl.getShopProducts);
router.get('/:id', ctrl.getProduct);

// seller actions
router.post('/', authMiddleware, roleMiddleware(['seller', 'creator', 'admin']), uploadHandler, ctrl.createProduct);
router.get('/seller/inventory', authMiddleware, ctrl.sellerInventory);
router.put('/:id', authMiddleware, roleMiddleware(['seller', 'creator', 'admin']), uploadHandler, ctrl.updateProduct);
router.delete('/:id', authMiddleware, ctrl.deleteProduct);
router.post('/:id/visibility', authMiddleware, ctrl.toggleVisibility);

module.exports = router;
