const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/advertController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// seller routes
router.post('/', authMiddleware, roleMiddleware(['seller','creator']), ctrl.createAd);
router.post('/:adId/request-publish', authMiddleware, roleMiddleware(['seller','creator']), ctrl.requestPublish);
router.post('/:adId/impression', ctrl.recordImpression);
router.post('/:adId/click', ctrl.recordClick);
router.get('/:adId', authMiddleware, ctrl.getAd);

// admin
router.post('/:adId/admin-status', authMiddleware, roleMiddleware('admin'), ctrl.adminUpdateAdStatus);

module.exports = router;
