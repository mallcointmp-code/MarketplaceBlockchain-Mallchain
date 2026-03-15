const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cartController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);
router.get('/', ctrl.getCart);
router.post('/', ctrl.updateCart);
router.post('/sync', ctrl.syncCart);
router.delete('/', ctrl.clearCart);

module.exports = router;
