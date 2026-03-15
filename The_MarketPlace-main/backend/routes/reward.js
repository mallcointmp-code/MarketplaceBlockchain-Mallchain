const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const User = require("../models/User");
const Product = require("../models/Product");
const Badge = require("../models/Badge");
const Transaction = require("../models/Transaction");
const Reward = require("../models/Reward");
const { v4: uuidv4 } = require("uuid");
const Joi = require("joi");
const { runInTransaction } = require('../utils/transactionHelper.js');

const rewardRedeemSchema = Joi.object({
  rewardId: Joi.string().length(24).required(),
});

router.post("/redeem-badge-discount/:productId/:badgeId", authMiddleware, async (req, res) => {
  try {
    await runInTransaction(async (session) => {
      // Find and validate all entities
      const user = await User.findById(req.user.userId).session(session);
      const product = await Product.findById(req.params.productId).session(session);
      const badge = await Badge.findById(req.params.badgeId).session(session);
      const seller = product ? await User.findById(product.seller).session(session) : null;

      // Check balances, ownership, eligibility
      if (!user) throw new Error("User not found");
      if (!product || product.sold) throw new Error("Product not available");
      if (!badge || !badge.active) throw new Error("Badge not available");

      const discount = badge.perkDiscount || 0;
      const finalPrice = product.price - discount;
      if (user.mallpoints < badge.requiredPoints) throw new Error("Insufficient points for badge");
      if (user.wallets.mallcoins < finalPrice) throw new Error("Insufficient Mallcoins for product");

      // Perform all updates
      user.mallpoints -= badge.requiredPoints;
      user.wallets.mallcoins -= finalPrice;
      user.badge = badge._id;
      product.sold = true;
      product.owner = user._id;
      if (seller) {
        seller.wallets.mallcoins += finalPrice;
        await seller.save({ session });
      }
      await user.save({ session });
      await product.save({ session });

      // Log transaction
      const tx = new Transaction({
        user: user._id,
        type: "redeem_badge_discount",
        currency: "mallcoins",
        amount: finalPrice,
        status: "completed",
        description: `Redeemed badge ${badge.name} and purchased product ${product.name} with discount`,
        reference: uuidv4(),
      });
      await tx.save({ session });

      res.json({ message: "Badge redeemed and product purchased with discount", product, badge });
    });
  } catch (err) {
    if (err.message === "User not found" || err.message === "Product not available" || err.message === "Badge not available") {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === "Insufficient points for badge" || err.message === "Insufficient Mallcoins for product") {
      return res.status(400).json({ error: err.message });
    }
    console.error("Redeem badge discount error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/redeem/:rewardId", authMiddleware, async (req, res) => {
  const { error } = rewardRedeemSchema.validate({ rewardId: req.params.rewardId });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    await runInTransaction(async (session) => {
      const user = await User.findById(req.user.userId).session(session);
      const reward = await Reward.findById(req.params.rewardId).session(session);

      if (!reward || reward.redeemed) throw new Error("Reward not available");
      if (user.wallets.mallcoins < reward.cost) throw new Error("Insufficient Mallcoins");

      user.wallets.mallcoins -= reward.cost;
      reward.redeemed = true;
      reward.redeemedBy = user._id;
      await user.save({ session });
      await reward.save({ session });

      const tx = new Transaction({
        user: user._id,
        type: "reward_redeem",
        currency: "mallcoins",
        amount: reward.cost,
        status: "completed",
        description: `Redeemed reward: ${reward.name}`,
        reference: uuidv4(),
      });
      await tx.save({ session });

      res.json({ message: "Reward redeemed successfully", reward });
    });
  } catch (err) {
    if (err.message === "Reward not available") return res.status(404).json({ error: err.message });
    if (err.message === "Insufficient Mallcoins") return res.status(400).json({ error: err.message });
    console.error("Redeem error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Example for any multi-entity atomic update
router.post("/atomic-update", authMiddleware, async (req, res) => {
  try {
    await runInTransaction(async (session) => {
      // Find and validate all entities
      const user = await User.findById(req.user.userId).session(session);
      const entityA = await EntityA.findById(req.body.entityAId).session(session);
      const entityB = await EntityB.findById(req.body.entityBId).session(session);

      // Check eligibility, balances, etc.
      if (!user || !entityA || !entityB) throw new Error("Required entity not found");
      if (user.wallets.mallcoins < entityA.cost) throw new Error("Insufficient Mallcoins");

      // Perform all updates
      user.wallets.mallcoins -= entityA.cost;
      entityA.status = "updated";
      entityB.owner = user._id;
      await user.save({ session });
      await entityA.save({ session });
      await entityB.save({ session });

      // Log transaction
      const tx = new Transaction({
        user: user._id,
        type: "atomic_update",
        currency: "mallcoins",
        amount: entityA.cost,
        status: "completed",
        description: `Atomic update for entities`,
        reference: uuidv4(),
      });
      await tx.save({ session });

      res.json({ message: "Atomic operation successful", entityA, entityB });
    });
  } catch (err) {
    if (err.message === "Required entity not found") return res.status(404).json({ error: err.message });
    if (err.message === "Insufficient Mallcoins") return res.status(400).json({ error: err.message });
    console.error("Atomic update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;