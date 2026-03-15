const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const OrthopharmProduct = require("../models/OrthopharmProduct");
const OrthopharmAppointment = require("../models/OrthopharmAppointment");
const OrthopharmEmployee = require("../models/OrthopharmEmployee");

// Authentication: Only Orthopharm admin can access
router.use(authMiddleware, async (req, res, next) => {
  if (!req.user || !req.user.isOrthopharmAdmin) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
});

// Add product
router.post("/products", async (req, res) => {
  const product = await OrthopharmProduct.create(req.body);
  res.json({ success: true, product });
});

// Update product
router.put("/products/:id", async (req, res) => {
  const product = await OrthopharmProduct.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, product });
});

// Delete product
router.delete("/products/:id", async (req, res) => {
  await OrthopharmProduct.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Manage appointments
router.put("/appointments/:id", async (req, res) => {
  const appointment = await OrthopharmAppointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, appointment });
});

// Assign employee to appointment
router.post("/appointments/:id/assign", async (req, res) => {
  const { employeeId } = req.body;
  const appointment = await OrthopharmAppointment.findByIdAndUpdate(
    req.params.id,
    { employee: employeeId, status: "accepted" },
    { new: true }
  );
  res.json({ success: true, appointment });
});

// Transfer funds to employee
router.post("/employees/:id/pay", async (req, res) => {
  const { amount } = req.body;
  const employee = await OrthopharmEmployee.findById(req.params.id);
  employee.walletBalance += amount;
  await employee.save();
  res.json({ success: true, balance: employee.walletBalance });
});

module.exports = router;