const express = require('express');
const ctrl = require("../controllers/adsController.js");
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const roleMiddleware = require('../middlewares/roleMiddleware.js');
const router = express.Router();

router.post("/", authMiddleware, ctrl.createAd);
router.post("/:adId/fund", authMiddleware, ctrl.fundAd);
// router.post("/serve", ctrl.serveAds); // Uncomment if implemented
router.post("/:adId/event", ctrl.recordAdEvent);

// seller ad management
router.get("/mine", authMiddleware, ctrl.getMyAds);
router.post("/:adId/pause", authMiddleware, ctrl.pauseAd);
router.post("/:adId/resume", authMiddleware, ctrl.resumeAd);

// admin actions
router.post("/admin/approve/:adId", authMiddleware, roleMiddleware("admin"), ctrl.adminApproveAd);
router.post("/admin/reject/:adId", authMiddleware, roleMiddleware("admin"), ctrl.adminRejectAd);

module.exports = router;