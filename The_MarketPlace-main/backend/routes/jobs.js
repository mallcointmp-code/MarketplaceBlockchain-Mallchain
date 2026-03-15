const express = require("express");
const router = express.Router();
const JobListing = require("../models/JobListing");
const JobApplication = require("../models/JobApplication");
const User = require("../models/User");
const { authMiddleware } = require("../middlewares/authMiddleware");

// --- List All Jobs (Browser) ---
router.get("/", async (req, res) => {
  try {
    const { category, type, location, search } = req.query;
    let query = { status: "open" }; // High security: Hide filled or completed jobs

    if (category) query.category = category;
    if (type) query.jobType = type;
    if (location) query.location = { $regex: location, $options: "i" };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const jobs = await JobListing.find(query)
      .populate("employer", "fullName username avatar")
      .sort({ premium: -1, createdAt: -1 });

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// --- Create Job (Restricted to Admin/Seller) ---
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Role check: Only admin and seller can create jobs
    if (!['admin', 'seller'].includes(req.user.role)) {
      return res.status(403).json({
        error: `Unauthorized. Your current role is '${req.user.role}'. Only admins and sellers can post job listings.`
      });
    }

    const { title, description, category, location, salaryRange, jobType, skillsRequired, deadline } = req.body;

    const job = new JobListing({
      employer: req.user._id,
      title,
      description,
      category,
      location,
      salaryRange,
      jobType,
      skillsRequired,
      deadline,
      status: "open",
      listingType: "job"
    });

    await job.save();
    res.status(201).json(job);
  } catch (err) {
    console.error("Job Creation Error:", err);
    res.status(500).json({ error: err.message || "Failed to create job" });
  }
});

// --- Get Job Detail ---
router.get("/:id", async (req, res) => {
  try {
    const job = await JobListing.findById(req.params.id)
      .populate("employer", "fullName username avatar bio");
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Apply for Job ---
router.post("/:id/apply", authMiddleware, async (req, res) => {
  try {
    const { coverLetter, resumeUrl, expectedSalary } = req.body;
    const jobId = req.params.id;

    // Check if already applied
    const existing = await JobApplication.findOne({ job: jobId, applicant: req.user._id });
    if (existing) return res.status(400).json({ error: "You have already applied for this job" });

    // Marketplace Integrity: Cannot apply for your own job
    const job = await JobListing.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.employer.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot apply for a job that you created." });
    }

    const application = new JobApplication({
      job: jobId,
      applicant: req.user._id,
      coverLetter,
      resumeUrl,
      expectedSalary
    });

    await application.save();

    // Update job listing
    await JobListing.findByIdAndUpdate(jobId, { $push: { applicants: application._id } });

    res.status(201).json({ message: "Application submitted successfully", application });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// --- Employer: Get My Jobs ---
router.get("/employer/my-jobs", authMiddleware, async (req, res) => {
  try {
    const jobs = await JobListing.find({ employer: req.user._id })
      .populate({
        path: 'applicants',
        populate: { path: 'applicant', select: 'fullName username email' }
      })
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your jobs" });
  }
});

// --- Applicant: Get My Applications ---
router.get("/applicant/my-applications", authMiddleware, async (req, res) => {
  try {
    const apps = await JobApplication.find({ applicant: req.user._id })
      .populate("job")
      .sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// --- Employer: Hire User & Lock Funds ---
router.post("/:id/hire", authMiddleware, async (req, res) => {
  try {
    const { applicationId } = req.body;
    const jobId = req.params.id;

    const job = await JobListing.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the employer can hire for this job" });
    }
    if (job.status !== "open") return res.status(400).json({ error: "Job is not open for hiring" });

    const application = await JobApplication.findById(applicationId);
    if (!application) return res.status(404).json({ error: "Application not found" });
    if (application.job.toString() !== jobId) return res.status(400).json({ error: "Application does not belong to this job" });

    const salary = application.expectedSalary || job.salaryRange.min;
    if (salary <= 0) return res.status(400).json({ error: "Invalid salary amount" });

    // Handle Wallet logic
    const Wallet = require("../models/Wallet");
    const WalletTransaction = require("../models/WalletTransaction");
    const wallet = await Wallet.findOne({ ownerId: req.user._id });

    if (!wallet || wallet.mallmoney < salary) {
      return res.status(400).json({ error: "Insufficient funds in mallmoney to hire. Please top up." });
    }

    // Lock funds (Reserved)
    wallet.mallmoney -= salary;
    wallet.reserved += salary;
    await wallet.save();

    // Create transaction log
    await WalletTransaction.create({
      ownerId: req.user._id,
      type: "payment",
      amount: -salary,
      currency: "KSH",
      status: "pending",
      meta: { jobId, type: "escrow_lock", description: `Escrow lock for job: ${job.title}` }
    });

    // Update job status
    job.hiredUser = application.applicant;
    job.escrowAmount = salary;
    job.paymentStatus = "escrowed";
    job.status = "closed";
    await job.save();

    // Update application status
    application.status = "accepted";
    await application.save();

    res.json({ message: "User hired and funds escrowed successfully", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Hire process failed" });
  }
});

// --- Applicant: Mark as Done ---
router.post("/:id/confirm-done", authMiddleware, async (req, res) => {
  try {
    const job = await JobListing.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.hiredUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the hired user can mark this job as done" });
    }

    job.status = "closed"; // In a real system, we might have a "pending_review" status
    job.markModified('status');
    await job.save();

    res.json({ message: "Job marked as completed. Waiting for employer release.", job });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as done" });
  }
});

// --- Employer: Release Payment ---
router.post("/:id/release-payment", authMiddleware, async (req, res) => {
  try {
    const job = await JobListing.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the employer can release payment" });
    }
    if (job.paymentStatus !== "escrowed") return res.status(400).json({ error: "No funds in escrow for this job" });

    const Wallet = require("../models/Wallet");
    const WalletTransaction = require("../models/WalletTransaction");

    // Deduct from employer's reserved
    const employerWallet = await Wallet.findOne({ ownerId: job.employer });
    employerWallet.reserved -= job.escrowAmount;
    await employerWallet.save();

    // Credit to applicant's mallmoney
    let applicantWallet = await Wallet.findOne({ ownerId: job.hiredUser });
    if (!applicantWallet) {
      applicantWallet = await Wallet.create({ ownerId: job.hiredUser });
    }
    applicantWallet.mallmoney += job.escrowAmount;
    await applicantWallet.save();

    // Log transactions
    await WalletTransaction.create({
      ownerId: job.hiredUser,
      type: "receive",
      amount: job.escrowAmount,
      currency: "KSH",
      status: "completed",
      meta: { jobId: job._id, description: `Payment received for job: ${job.title}` }
    });

    job.paymentStatus = "paid";
    await job.save();

    res.json({ message: "Payment released successfully to the applicant", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment release failed" });
  }
});

module.exports = router;
