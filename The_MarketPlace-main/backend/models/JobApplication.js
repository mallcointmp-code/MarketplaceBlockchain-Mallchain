// backend/models/JobApplication.js
const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "JobListing", required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  resumeUrl: { type: String },
  coverLetter: { type: String },
  expectedSalary: { type: Number },
  status: { type: String, enum: ["pending", "shortlisted", "accepted", "rejected"], default: "pending" },
  appliedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
