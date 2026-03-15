const express = require('express');
const router = express.Router();
const shopCtrl = require('../controllers/shopController');
const productCtrl = require('../controllers/productController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const { body, validationResult } = require('express-validator');

// create shop
router.post('/', authMiddleware, roleMiddleware(['seller']), [body('name').notEmpty().withMessage('name required')], asyncHandler(async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	return shopCtrl.createShop(req, res, next);
}));
// pay rent
router.post('/pay-rent', authMiddleware, roleMiddleware(['seller']), [body('shopId').notEmpty().withMessage('shopId required'), body('amount').isFloat({ gt: 0 }).withMessage('amount must be > 0')], asyncHandler(async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	return shopCtrl.payShopRent(req, res, next);
}));
// list shop products
router.get('/:shopId/products', asyncHandler(shopCtrl.listShopProducts));

// List shops (public) with optional category/subcategory filters
router.get('/', asyncHandler(shopCtrl.listShops));

// product endpoints (convenience)
router.post('/:shopId/product', authMiddleware, roleMiddleware(['seller']), asyncHandler(productCtrl.createProduct));
router.get('/product/:productId', asyncHandler(productCtrl.getProduct));

module.exports = router;
