const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const User = require("../models/User");
const Badge = require("../models/Badge");
const Transaction = require("../models/Transaction");
const { v4: uuidv4 } = require("uuid");
const Joi = require("joi");
const { badgePurchaseCounter } = require("../metrics");
const { ok, fail } = require("../utils/reply");
const { runInTransaction } = require('../utils/transactionHelper.js');

const badgePurchaseSchema = Joi.object({
  badgeId: Joi.string().length(24).required(),
});

const convertSchema = Joi.object({
  amount: Joi.number().min(1).required(),
});

const badgeGiftSchema = Joi.object({
  badgeId: Joi.string().length(24).required(),
  recipientId: Joi.string().length(24).required(),
});

const badgeRenewSchema = Joi.object({
  badgeId: Joi.string().length(24).required(),
});

// --- Admin Creates Badge ---
router.post("/create", authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: "Admin only" });

  try {
    const { name, type, price, description, perks } = req.body;
    const badge = new Badge({ name, type, price, description, perks });
    await badge.save();
    res.json({ message: "Badge created successfully", badge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- View All Badges ---
router.get("/", async (req, res) => {
  try {
    const badges = await Badge.find();
    res.json(badges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// purchase general badge
router.post("/purchase/:id", authMiddleware, async (req, res) => {
  const { error } = badgePurchaseSchema.validate({ badgeId: req.params.id });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    await runInTransaction(async (session) => {
      const badge = await Badge.findById(req.params.id).session(session);
      if (!badge || badge.type !== "general") throw new Error("BADGE_NOT_FOUND");

      const user = await User.findById(req.user.userId).session(session);
      if (user.wallets.mallcoins < badge.price) throw new Error("Insufficient Mallcoins");

      user.wallets.mallcoins -= badge.price;
      user.badge = badge._id;
      await user.save({ session });

      const tx = new Transaction({
        user: user._id, type: "purchase", currency: "mallcoins", amount: badge.price,
        status: "completed", description: `Purchased badge: ${badge.name}`, reference: uuidv4(),
      });
      await tx.save({ session });
      badgePurchaseCounter.inc();
      return ok(res, { badge });
    });
  } catch (err) {
    if (err.message === "BADGE_NOT_FOUND") return fail(res, "BADGE_NOT_FOUND", "General badge not found", 404);
    if (err.message === "Insufficient Mallcoins") return res.status(400).json({ error: err.message });
    console.error("Purchase badge error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// purchase job badge
router.post("/purchase-job/:id", authMiddleware, async (req, res) => {
  try {
    await runInTransaction(async (session) => {
      const badge = await Badge.findById(req.params.id).session(session);
      if (!badge || badge.type !== "job") throw new Error("Job badge not found");

      const user = await User.findById(req.user.userId).session(session);
      if (user.wallets.mallcoins < badge.price) throw new Error("Insufficient Mallcoins");

      user.wallets.mallcoins -= badge.price;
      user.jobBadge = badge._id;
      await user.save({ session });

      const tx = new Transaction({
        user: user._id, type: "purchase", currency: "mallcoins", amount: badge.price,
        status: "completed", description: `Purchased job badge: ${badge.name}`, reference: uuidv4(),
      });
      await tx.save({ session });
      res.json({ message: "Job badge purchased successfully", badge });
    });
  } catch (err) {
    if (err.message === "Job badge not found") return res.status(404).json({ error: err.message });
    if (err.message === "Insufficient Mallcoins") return res.status(400).json({ error: err.message });
    console.error("Purchase job badge error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// purchase premium
router.post("/purchase-premium", authMiddleware, async (req, res) => {
  try {
    await runInTransaction(async (session) => {
      const user = await User.findById(req.user._id).session(session);
      if (user.badgeOwned) throw new Error("You already own a premium badge.");

      const badge = await Badge.findOne({ priceKsh: 23, active: true }).session(session);
      if (!badge) throw new Error("Premium badge not available.");
      if ((user.mallcoins || 0) < badge.priceKsh) throw new Error("Insufficient Mallcoins.");

      user.mallcoins -= badge.priceKsh;
      user.badgeOwned = true;
      await user.save({ session });

      const tx = new Transaction({
        user: user._id, type: "purchase", currency: "mallcoins", amount: badge.priceKsh,
        status: "completed", description: `Purchased premium badge: ${badge.name}`, reference: uuidv4(),
      });
      await tx.save({ session });
      res.json({ message: "Premium badge purchased successfully", badge });
    });
  } catch (err) {
    if (err.message === "Premium badge not available.") return res.status(404).json({ error: err.message });
    if (err.message.includes("already own") || err.message === "Insufficient Mallcoins.") return res.status(400).json({ error: err.message });
    console.error("Purchase premium error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// purchase MLPTS conversion badge
router.post("/purchase-mlpts-badge/:id", authMiddleware, async (req, res) => {
  try {
    await runInTransaction(async (session) => {
      const badge = await Badge.findById(req.params.id).session(session);
      if (!badge || !badge.active || !badge.benefits.includes("convert MLPTS")) throw new Error("MLPTS conversion badge not found or inactive.");

      const user = await User.findById(req.user._id).session(session);
      user.mlptsBadges = user.mlptsBadges || [];
      if (user.mlptsBadges.some(b => b.badgeId.toString() === badge._id.toString())) throw new Error("You already own this MLPTS conversion badge.");
      if ((user.mallcoins || 0) < badge.priceKsh) throw new Error("Insufficient Mallcoins.");

      user.mallcoins -= badge.priceKsh;
      let expiry = new Date();
      if (badge.priceKsh === 13) expiry.setDate(expiry.getDate() + 10);
      if (badge.priceKsh === 19) expiry.setDate(expiry.getDate() + 14);
      if (badge.priceKsh === 26) expiry.setDate(expiry.getDate() + 23);
      if (badge.priceKsh === 37) { expiry.setMonth(expiry.getMonth() + 1); expiry.setDate(expiry.getDate() + 8); }
      user.mlptsBadges.push({ badgeId: badge._id, expiry });
      await user.save({ session });

      const tx = new Transaction({
        user: user._id, type: "purchase", currency: "mallcoins", amount: badge.priceKsh,
        status: "completed", description: `Purchased MLPTS conversion badge: ${badge.name}`, reference: uuidv4(),
      });
      await tx.save({ session });
      res.json({ message: "MLPTS conversion badge purchased successfully", badge });
    });
  } catch (err) {
    if (err.message.includes("not found")) return res.status(404).json({ error: err.message });
    if (err.message.includes("already own") || err.message.includes("Insufficient")) return res.status(400).json({ error: err.message });
    console.error("Purchase mlpts badge error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// renew mlpts badge
router.post("/renew-mlpts-badge/:id", authMiddleware, async (req, res) => {
  const { error } = badgeRenewSchema.validate({ badgeId: req.params.id });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    await runInTransaction(async (session) => {
      const badge = await Badge.findById(req.params.id).session(session);
      if (!badge || !badge.active || !badge.benefits.includes("convert MLPTS")) throw new Error("MLPTS conversion badge not found or inactive.");

      const user = await User.findById(req.user._id).session(session);
      user.mlptsBadges = user.mlptsBadges || [];
      const badgeEntry = user.mlptsBadges.find(b => b.badgeId.toString() === badge._id.toString());
      if (!badgeEntry) throw new Error("You do not own this MLPTS badge.");
      if (!badgeEntry.expiry || badgeEntry.expiry > new Date()) throw new Error("Badge is still active, cannot renew yet.");
      if ((user.mallcoins || 0) < badge.priceKsh) throw new Error("Insufficient Mallcoins.");

      user.mallcoins -= badge.priceKsh;
      let expiry = new Date();
      if (badge.priceKsh === 13) expiry.setDate(expiry.getDate() + 10);
      if (badge.priceKsh === 19) expiry.setDate(expiry.getDate() + 14);
      if (badge.priceKsh === 26) expiry.setDate(expiry.getDate() + 23);
      if (badge.priceKsh === 37) { expiry.setMonth(expiry.getMonth() + 1); expiry.setDate(expiry.getDate() + 8); }
      badgeEntry.expiry = expiry;
      await user.save({ session });

      const tx = new Transaction({
        user: user._id, type: "renewal", currency: "mallcoins", amount: badge.priceKsh,
        status: "completed", description: `Renewed MLPTS conversion badge: ${badge.name}`, reference: uuidv4(),
      });
      await tx.save({ session });
      res.json({ message: "MLPTS conversion badge renewed successfully", badge });
    });
  } catch (err) {
    if (err.message.includes("not found")) return res.status(404).json({ error: err.message });
    if (err.message.includes("do not own") || err.message.includes("still active") || err.message.includes("Insufficient")) return res.status(400).json({ error: err.message });
    console.error("Renew mlpts badge error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// convert mlpts
router.post("/convert-mlpts", authMiddleware, async (req, res) => {
  const { error } = convertSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    await runInTransaction(async (session) => {
      const user = await User.findById(req.user._id).session(session);
      user.mlptsBadges = user.mlptsBadges || [];
      const now = new Date();
      const validBadges = user.mlptsBadges.filter(b => b.expiry > now);
      if (!validBadges.length) throw new Error("You must own a valid MLPTS conversion badge to convert MLPTS.");

      const badgeDocs = await Badge.find({ _id: { $in: validBadges.map(b => b.badgeId) } }).session(session);
      let maxRate = 1;
      let badgeUsed = null;
      for (const badge of badgeDocs) {
        if (badge.priceKsh === 13 && maxRate < 1.0) { maxRate = 1.0; badgeUsed = badge; }
        if (badge.priceKsh === 19 && maxRate < 1.1) { maxRate = 1.1; badgeUsed = badge; }
        if (badge.priceKsh === 26 && maxRate < 1.2) { maxRate = 1.2; badgeUsed = badge; }
        if (badge.priceKsh === 37 && maxRate < 1.5) { maxRate = 1.5; badgeUsed = badge; }
      }
      const mlpts = user.mallpoints || 0;
      if (mlpts <= 0) throw new Error("No MLPTS to convert.");

      const converted = Math.floor(mlpts * maxRate);
      user.mallpoints = 0;
      user.mallcoins = (user.mallcoins || 0) + converted;
      await user.save({ session });
      res.json({ message: `Converted ${mlpts} MLPTS to ${converted} Mallcoins using badge: ${badgeUsed ? badgeUsed.name : 'basic'}.`, mallcoins: user.mallcoins });
    });
  } catch (err) {
    if (err.message.includes("must own") || err.message === "No MLPTS to convert.") return res.status(403).json({ error: err.message });
    console.error("Convert MLPTS error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// gift badge
router.post("/gift/:badgeId", authMiddleware, async (req, res) => {
  const { error } = badgeGiftSchema.validate({ badgeId: req.params.badgeId, recipientId: req.body.recipientId });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    await runInTransaction(async (session) => {
      const { recipientId } = req.body;
      const sender = await User.findById(req.user.userId).session(session);
      const recipient = await User.findById(recipientId).session(session);
      const badge = await Badge.findById(req.params.badgeId).session(session);

      if (!recipient || !badge) throw new Error("Recipient or badge not found");
      if (sender.wallets.mallcoins < badge.price) throw new Error("Insufficient Mallcoins");

      sender.wallets.mallcoins -= badge.price;
      recipient.badge = badge._id;
      await sender.save({ session });
      await recipient.save({ session });

      const tx = new Transaction({
        user: sender._id, type: "badge_gift", currency: "mallcoins", amount: badge.price,
        status: "completed", description: `Gifted badge: ${badge.name} to ${recipient.username}`, reference: uuidv4(),
      });
      await tx.save({ session });
      res.json({ message: "Badge gifted successfully", badge });
    });
  } catch (err) {
    if (err.message === "Recipient or badge not found") return res.status(404).json({ error: err.message });
    if (err.message === "Insufficient Mallcoins") return res.status(400).json({ error: err.message });
    console.error("Gift badge error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
