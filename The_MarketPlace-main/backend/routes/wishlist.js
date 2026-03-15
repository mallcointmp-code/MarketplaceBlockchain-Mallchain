const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/wishlistController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);
router.get('/', ctrl.getWishlist);
router.post('/toggle', ctrl.toggleWishlist);
router.delete('/', ctrl.clearWishlist);

module.exports = router;
