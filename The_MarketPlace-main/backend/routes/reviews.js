const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const reviewCtrl = require("../controllers/reviewController");

// New endpoints (coexist with earlier simple submit/get) - follow v2 style
router.post("/v2/:productId", authMiddleware, reviewCtrl.submitReview);
router.get("/v2/:productId", reviewCtrl.getReviewsForProduct);
router.post("/v2/vote/:reviewId", authMiddleware, reviewCtrl.voteHelpful);
router.post("/v2/report/:reviewId", authMiddleware, reviewCtrl.reportReview);
router.post("/v2/moderate/:reviewId", authMiddleware, roleMiddleware('admin'), reviewCtrl.adminModerate);

// keep legacy endpoints for compatibility
const ProductReview = require("../models/ProductReview");
const ShopReview = require("../models/ShopReview");
const Joi = require("joi");

const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().max(500).allow(""),
  targetId: Joi.string().length(24).required(),
  type: Joi.string().valid("user", "employer", "product", "shop").required(),
});

router.post("/submit", authMiddleware, async (req, res) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { rating, comment, targetId, type } = req.body;
    let review;

    if (type === "product") {
      review = new ProductReview({
        reviewer: req.user._id,
        product: targetId,
        rating,
        comment
      });
    } else if (type === "shop") {
      review = new ShopReview({
        reviewer: req.user._id,
        shop: targetId,
        rating,
        comment
      });
    } else {
      return res.status(400).json({ error: "Invalid review type." });
    }

    await review.save();
    res.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} review submitted.`, review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple product review endpoints (compat)
router.post('/product', authMiddleware, reviewCtrl.postReview);
router.get('/product/:productId/reviews', reviewCtrl.getProductReviews);

router.get("/product/:productId", async (req, res) => {
  try {
    const reviews = await ProductReview.find({ product: req.params.productId }).populate("reviewer", "username");
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/shop/:shopId", async (req, res) => {
  try {
    const reviews = await ShopReview.find({ shop: req.params.shopId }).populate("reviewer", "username");
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
