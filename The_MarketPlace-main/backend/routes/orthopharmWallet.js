const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const OrthopharmEmployee = require("../models/OrthopharmEmployee");

// All endpoints require employee authentication
router.use(authMiddleware, async (req, res, next) => {
  if (!req.user || !req.user.isOrthopharmEmployee) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
});

// Top up fiat balance
router.post("/topup", async (req, res) => {
  try {
    const { amount } = req.body;
    const employee = await OrthopharmEmployee.findById(req.user._id);
    employee.fiatBalance += amount;
    await employee.save();
    res.json({ success: true, fiatBalance: employee.fiatBalance });
  } catch (err) {
    res.status(500).json({ error: "Top-up failed" });
  }
});

// Withdraw fiat balance
router.post("/withdraw", async (req, res) => {
  try {
    const { amount } = req.body;
    const employee = await OrthopharmEmployee.findById(req.user._id);
    if (employee.fiatBalance < amount) return res.status(400).json({ error: "Insufficient balance" });
    employee.fiatBalance -= amount;
    await employee.save();
    res.json({ success: true, fiatBalance: employee.fiatBalance });
  } catch (err) {
    res.status(500).json({ error: "Withdraw failed" });
  }
});

// Use mallcoins
router.post("/use-mallcoins", async (req, res) => {
  try {
    const { amount } = req.body;
    const employee = await OrthopharmEmployee.findById(req.user._id);
    if (employee.mallcoins < amount) return res.status(400).json({ error: "Insufficient mallcoins" });
    employee.mallcoins -= amount;
    await employee.save();
    res.json({ success: true, mallcoins: employee.mallcoins });
  } catch (err) {
    res.status(500).json({ error: "Mallcoin usage failed" });
  }
});

// Grow section: add to grow balance
router.post("/grow/add", async (req, res) => {
  try {
    const { amount } = req.body;
    const employee = await OrthopharmEmployee.findById(req.user._id);
    employee.growBalance += amount;
    await employee.save();
    res.json({ success: true, growBalance: employee.growBalance });
  } catch (err) {
    res.status(500).json({ error: "Grow balance update failed" });
  }
});

module.exports = router;