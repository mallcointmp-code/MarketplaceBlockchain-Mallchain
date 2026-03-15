const express = require("express");
const router = express.Router();
const Job = require("../models/JobListing");
const Application = require("../models/Application.js");
const { authMiddleware } = require("../middlewares/authMiddleware");
const adminOnly = require("../middlewares/adminOnly");

// Admin: Get all jobs (with moderation info)
router.get("/jobs", authMiddleware, adminOnly, async (req, res) => {
  try {
    const jobs = await Job.find().sort({ postedAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Approve a job
router.post("/jobs/:id/approve", authMiddleware, adminOnly, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, { status: "open" }, { new: true });
    res.json({ message: "Job approved.", job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Reject a job
router.post("/jobs/:id/reject", authMiddleware, adminOnly, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, { status: "rejected" }, { new: true });
    res.json({ message: "Job rejected.", job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Remove a job
router.delete("/jobs/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: "Job removed." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all applications
router.get("/applications", authMiddleware, adminOnly, async (req, res) => {
  try {
    const applications = await Application.find().sort({ appliedAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Remove an application
router.delete("/applications/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await Application.findByIdAndDelete(req.params.id);
    res.json({ message: "Application removed." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
