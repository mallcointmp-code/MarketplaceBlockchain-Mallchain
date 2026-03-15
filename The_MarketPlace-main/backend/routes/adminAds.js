// routes/adminAds.js (CommonJS)
const express = require('express');
const Ad = require('../models/Ad.js');
const adsService = require('../services/adsService.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const roleMiddleware = require('../middlewares/roleMiddleware.js');
const ctrl = require('../controllers/adminAdsController.js');

const router = express.Router();

// Using controller methods from adminAdsController
router.get('/pending', authMiddleware, roleMiddleware('admin'), ctrl.listPendingAds);
router.post('/approve/:adId', authMiddleware, roleMiddleware('admin'), ctrl.approveAd);
router.post('/reject/:adId', authMiddleware, roleMiddleware('admin'), ctrl.rejectAd);

// Optional: fallback inline methods (if you want to keep them)
router.get('/pending-inline', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const ads = await Ad.find({ status: 'pending' });
  res.json(ads);
});

router.post('/approve-inline/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  if (!ad) return res.status(404).json({ error: 'not found' });
  ad.status = 'approved';
  await ad.save();
  res.json(ad);
});

router.post('/reject-inline/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  await adsService.refund(req.params.id, req.body.reason);
  res.json({ success: true });
});

module.exports = router;
