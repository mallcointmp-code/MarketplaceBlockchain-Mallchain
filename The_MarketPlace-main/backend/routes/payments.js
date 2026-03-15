const express = require("express");
const router = express.Router();
const { processPayment } = require("../services/paymentService");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/pay", authMiddleware, async (req, res) => {
  try {
    const charge = await processPayment(req.body);
    res.json({ success: true, charge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;