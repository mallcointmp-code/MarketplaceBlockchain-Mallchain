const express = require("express");
const Application = require("../models/Application");
const Job = require("../models/JobListing");
const Badge = require("../models/Badge");

const router = express.Router();

// Apply for a job
router.post("/", async (req, res) => {
  try {
    const { jobId, userId, resumeUrl, coverLetter } = req.body;

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.status !== "open")
      return res.status(400).json({ message: "Job is closed" });

    // find if a user tried applying
    const existing = await Application.findOne({ jobId, userId });
    if (existing)
      return res.status(400).json({ message: "You already applied for this job" });

    const app = await Application.create({
      jobId,
      userId,
      resumeUrl,
      coverLetter,
      status: "pending",
    });

    res.status(201).json({ message: "Application submitted", app });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// get all user application
router.get("/user/:userId", async (req, res) => {
  try {
    const list = await Application.find({ userId: req.params.userId }).populate("jobId");
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Job Applicants
router.get("/job/:jobId", async (req, res) => {
  try {
    const apps = await Application.find({ jobId: req.params.jobId }).populate("userId");
    res.json(apps);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// (approve/reject)
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const app = await Application.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(app);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

