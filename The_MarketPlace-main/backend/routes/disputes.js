const express = require("express");
const router = express.Router();

const Dispute = require("../models/Dispute");
const Order = require("../models/Order");
const { protect } = require("../middlewares/authMiddleware");

/* ===========================
   CREATE DISPUTE
=========================== */

router.post("/", protect, async (req, res) => {
  try {
    const {
      relatedOrderId,
      title,
      description,
      evidence,
      targetUser
    } = req.body;

    if (!title || !description || !targetUser) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const dispute = await Dispute.create({
      relatedOrder: relatedOrderId || null,
      raisedBy: req.user._id,
      targetUser,
      title,
      description,
      evidence,
      status: "open"
    });

    // Mark related order (optional but useful)
    if (relatedOrderId) {
      await Order.findByIdAndUpdate(
        relatedOrderId,
        { disputeRaised: true },
        { new: true }
      );
    }

    res.status(201).json({
      message: "Dispute submitted successfully",
      dispute
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===========================
   GET MY DISPUTES
   (raised by OR targeted at me)
=========================== */

router.get("/me", protect, async (req, res) => {
  try {
    const disputes = await Dispute.find({
      $or: [
        { raisedBy: req.user._id },
        { targetUser: req.user._id }
      ]
    }).sort({ createdAt: -1 });

    res.json(disputes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===========================
   ADMIN: VIEW DISPUTES BY USER
=========================== */

router.get("/user/:userId", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin only" });
    }

    const list = await Dispute.find({
      $or: [
        { raisedBy: req.params.userId },
        { targetUser: req.params.userId }
      ]
    }).sort({ createdAt: -1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===========================
   ADMIN: RESOLVE DISPUTE
=========================== */

router.put("/resolve/:id", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin only" });
    }

    const { resolution, status } = req.body;

    if (!resolution) {
      return res.status(400).json({ message: "Resolution is required" });
    }

    const updated = await Dispute.findByIdAndUpdate(
      req.params.id,
      {
        resolution,
        status: status || "resolved",
        resolvedAt: new Date()
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    res.json({
      message: "Dispute resolved successfully",
      dispute: updated
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
