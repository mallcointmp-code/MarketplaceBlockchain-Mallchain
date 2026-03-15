// backend/routes/adminCareers.js
const express = require("express");
const Career = require("../models/Career");
const Application = require("../models/Application");
const { authMiddleware } = require("../middlewares/authMiddleware"); // use one consistent name
const roleMiddleware = require("../middlewares/roleMiddleware");    // same here

const router = express.Router();

// Admin create career
router.post("/", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  try {
    const { title, department, description, location, salary, deadline } = req.body;
    const career = await Career.create({ title, department, description, location, salary, deadline, status: "open" });
    res.status(201).json({ message: "Career opportunity created", career });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all careers (admin-only)
router.get("/", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  try {
    const careers = await Career.find().sort({ createdAt: -1 });
    res.json(careers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get applications for a career
router.get("/:id/applications", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  try {
    const applications = await Application.find({ job: req.params.id }).populate("applicant", "name email phone");
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin delete career
router.delete("/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  try {
    await Career.findByIdAndDelete(req.params.id);
    res.json({ message: "Career deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
