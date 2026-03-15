// backend/models/JobListing.js
const mongoose = require("mongoose");

const jobListingSchema = new mongoose.Schema({
  employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: "Other" },
  location: { type: String, default: "Remote" },
  salaryRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
  },
  jobType: { type: String, enum: ["Full-time", "Part-time", "Contract", "Remote"], default: "Full-time" },
  skillsRequired: [{ type: String }],
  deadline: { type: Date },
  status: { type: String, enum: ["open", "closed", "paused", "expired"], default: "open" },
  premium: { type: Boolean, default: false },
  featuredUntil: { type: Date },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "JobApplication" }],
  hiredUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  escrowAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ["none", "escrowed", "paid", "refunded"], default: "none" },
  listingType: { type: String, default: "job", index: true },
}, { timestamps: true });

module.exports = mongoose.model("JobListing", jobListingSchema);
