const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const Product = require("../models/Product");

// Authentication: Only supermarket workers can access
router.use(authMiddleware, async (req, res, next) => {
  if (!req.user || !req.user.isSupermarketWorker) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
});

// List products by category
router.get("/products", async (req, res) => {
  const { category } = req.query;
  const products = await Product.find({ category });
  res.json({ success: true, products });
});

// Add product
router.post("/products", async (req, res) => {
  const product = await Product.create({ ...req.body, addedBy: req.user._id });
  res.json({ success: true, product });
});

// Update product
router.put("/products/:id", async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, product });
});

// Delete product
router.delete("/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;