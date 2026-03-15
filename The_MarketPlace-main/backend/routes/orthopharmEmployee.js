const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const OrthopharmAppointment = require("../models/OrthopharmAppointment");
const OrthopharmProduct = require("../models/OrthopharmProduct");

// Authentication: Only Orthopharm employees can access
router.use(authMiddleware, async (req, res, next) => {
  if (!req.user || !req.user.isOrthopharmEmployee) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
});

// Get assigned appointments
router.get("/appointments", async (req, res) => {
  const appointments = await OrthopharmAppointment.find({ employee: req.user._id });
  res.json({ success: true, appointments });
});

// List flash sale products
router.get("/flash-sales", async (req, res) => {
  const products = await OrthopharmProduct.find({ flashSale: true });
  res.json({ success: true, products });
});

module.exports = router;