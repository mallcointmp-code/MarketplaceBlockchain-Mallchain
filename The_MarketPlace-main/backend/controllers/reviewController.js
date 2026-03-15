const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ReviewVote = require('../models/ReviewVote');

// submit a review (v2)
exports.submitReview = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ error: 'auth required' });
    const productId = req.params.productId;
    const { rating, title, body, images, orderId } = req.body;
    if (!productId || !rating) return res.status(400).json({ error: 'productId and rating required' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'product not found' });

    // determine verifiedPurchase by checking order contains this product (if orderId provided)
    let verified = false;
    if (orderId) {
      try {
        const Order = require('../models/Order');
        const order = await Order.findOne({ _id: orderId, buyerId: userId, 'items.productId': productId });
        if (order) verified = true;
      } catch (e) { /* ignore */ }
    }

    const r = new Review({ productId, userId, orderId: orderId || null, rating, title: title || '', body: body || '', images: images || [], verifiedPurchase: verified });
    await r.save();

    // update product aggregates (avgRating, ratingCount)
    try {
      const agg = await Review.aggregate([
        { $match: { productId: mongoose.Types.ObjectId(productId), reported: { $ne: true } } },
        { $group: { _id: '$productId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]);
      const row = agg[0] || null;
      await Product.findByIdAndUpdate(productId, { averageRating: row ? row.avgRating : 0, ratingCount: row ? row.count : 0 });
    } catch (e) { console.error('update rating failed', e); }

    try { await AuditLog.create({ user: userId, action: 'review.create', details: { productId, rating } }); } catch (e) { }

    res.json({ ok: true, review: r });
  } catch (err) { console.error('submitReview', err); res.status(500).json({ error: 'failed to submit review' }); }
};

exports.getReviewsForProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;
    const q = { productId };
    const items = await Review.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    res.json({ data: items });
  } catch (err) { console.error('getReviewsForProduct', err); res.status(500).json({ error: 'failed' }); }
};

exports.voteHelpful = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ error: 'auth required' });
    const reviewId = req.params.reviewId;
    const { vote } = req.body; // expect 1 or -1
    if (![1, -1].includes(Number(vote))) return res.status(400).json({ error: 'invalid vote' });

    const rv = await Review.findById(reviewId);
    if (!rv) return res.status(404).json({ error: 'not found' });

    // Check for existing vote
    const existing = await ReviewVote.findOne({ reviewId, userId });
    if (existing) {
      if (existing.vote === Number(vote)) {
        return res.status(200).json({ ok: false, message: 'Already voted' });
      }
      // flip vote: decrement old counter, increment new
      if (existing.vote === 1) rv.helpfulUp = Math.max(0, (rv.helpfulUp || 0) - 1);
      else rv.helpfulDown = Math.max(0, (rv.helpfulDown || 0) - 1);
      if (Number(vote) === 1) rv.helpfulUp = (rv.helpfulUp || 0) + 1;
      else rv.helpfulDown = (rv.helpfulDown || 0) + 1;
      existing.vote = Number(vote);
      await existing.save();
      await rv.save();
      return res.json({ ok: true, helpfulUp: rv.helpfulUp, helpfulDown: rv.helpfulDown });
    }

    // create new vote
    const vv = new ReviewVote({ reviewId, userId, vote: Number(vote) });
    await vv.save();
    if (Number(vote) === 1) rv.helpfulUp = (rv.helpfulUp || 0) + 1;
    else rv.helpfulDown = (rv.helpfulDown || 0) + 1;
    await rv.save();
    res.json({ ok: true, helpfulUp: rv.helpfulUp, helpfulDown: rv.helpfulDown });
  } catch (err) { console.error('voteHelpful', err); res.status(500).json({ error: 'failed' }); }
};

exports.reportReview = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ error: 'auth required' });
    const reviewId = req.params.reviewId;
    const { reason } = req.body;
    const rv = await Review.findById(reviewId);
    if (!rv) return res.status(404).json({ error: 'not found' });
    rv.reported = true;
    rv.moderationNote = reason || '';
    rv.visible = false;
    await rv.save();
    try { await AuditLog.create({ user: userId, action: 'review.report', details: { reviewId, reason } }); } catch (e) {}
    res.json({ ok: true });
  } catch (err) { console.error('reportReview', err); res.status(500).json({ error: 'failed' }); }
};

exports.adminModerate = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { action, note } = req.body; // action: approve/hidden/delete
    const rv = await Review.findById(reviewId);
    if (!rv) return res.status(404).json({ error: 'not found' });
    if (action === 'approve') { rv.reported = false; rv.visible = true; }
    else if (action === 'hide') { rv.visible = false; rv.moderated = true; rv.moderationNote = note || ''; }
    else if (action === 'delete') { await Review.deleteOne({ _id: reviewId }); return res.json({ ok: true }); }
    await rv.save();
    res.json({ ok: true, review: rv });
  } catch (err) { console.error('adminModerate', err); res.status(500).json({ error: 'failed' }); }
};

// Simple compatibility endpoints (from user-provided snippet)
const ProductReview = require('../models/ProductReview');

exports.postReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user ? req.user._id : null;
    if (!productId || !rating) return res.status(400).json({ error: 'productId + rating required' });

    const rev = await ProductReview.create({ productId, userId, rating, comment });
    const agg = await ProductReview.aggregate([
      { $match: { productId: require('mongoose').Types.ObjectId(productId) } },
      { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    if (agg[0]) {
      await Product.findByIdAndUpdate(productId, { rating: agg[0].avg, reviewsCount: agg[0].count });
    }
    res.json({ ok: true, review: rev });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const productId = req.params.productId;
    const reviews = await ProductReview.find({ productId }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ ok: true, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// (Duplicate block removed; earlier implementations retained.)
