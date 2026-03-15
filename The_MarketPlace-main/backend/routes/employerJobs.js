// backend/routes/employerJobs.js
const express = require("express");
const JobListing = require("../models/JobListing");
const JobApplication = require("../models/JobApplication");
const { protect } = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

const router = express.Router();

// Employer: create job listing
router.post("/", protect, requireRole(["employer"]), async (req, res) => {
  try {
    const payload = { ...req.body, employer: req.user.id };
    const job = await JobListing.create(payload);
    res.status(201).json({ message: "Job openning created succesfully", job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get all jobs by current employer (handled below with protect middleware)


// Employer: list own job listings
router.get("/mine", protect, requireRole(["employer"]), async (req, res) => {
  try {
    const jobs = await JobListing.find({ employer: req.user.id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Employer: view applicants for a job
router.get("/:jobId/applicants", protect, requireRole(["employer"]), async (req, res) => {
  try {
    const job = await JobListing.findById(req.params.jobId).populate({
      path: "applicants",
      populate: { path: "applicant", select: "name email phone" }
    });
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.employer.toString() !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

    res.json(job.applicants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Employer: change job status
router.patch("/:jobId/status", protect, requireRole(["employer"]), async (req, res) => {
  try {
    const { status } = req.body;
    const job = await JobListing.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.employer.toString() !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

    job.status = status;
    await job.save();
    res.json({ message: "Job status updated", job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Close job
router.put("/:id/close", protect, async (req, res) => {
  try {
    const job = await JobListing.findByIdAndUpdate(req.params.id, { status: "closed" }, { new: true });
    res.json({ message: "Job closed successfully", job });
  } catch (err) {
    res.status(500).json({ message: "Failed to close job", error: err.message });
  }
});


module.exports = router;
