const express = require("express");
const KycVerification = require("../models/KycVerification");
const Wallet = require("../models/Wallet");

const router = express.Router();

// 🧾 Submit KYC documents
router.post("/", async (req, res) => {
  try {
    const { userId, idType, documentUrl } = req.body;
    const record = await KycVerification.create({
      userId,
      idType,
      documentUrl,
      status: "pending",
    });
    res.status(201).json({ message: "KYC submitted successfully", record });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 🧾 Get user’s KYC status
router.get("/:userId", async (req, res) => {
  try {
    const record = await KycVerification.findOne({ userId: req.params.userId });
    res.json(record);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 🛡️ Admin approves or rejects KYC
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body; // approved or rejected
    const updated = await KycVerification.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ message: "KYC status updated", updated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

