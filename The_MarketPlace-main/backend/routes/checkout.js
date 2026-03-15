const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/checkoutController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);
router.post('/mallmoney', ctrl.checkoutMallmoney);
router.post('/mallcoins', ctrl.checkoutMallcoins);
router.post('/supermarket', ctrl.checkoutSupermarket);
router.post('/supermarket/confirm', ctrl.confirmSupermarketPayment);
router.get('/order/:id', ctrl.getOrder);

module.exports = router;

