// backend/models/KycVerification.js
const mongoose = require("mongoose");

const KycVerificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  documents: [
    {
      type: { type: String }, // passport, id, driver_license
      url: { type: String },
    }
  ],
  status: { type: String, enum: ["pending","approved","rejected"], default: "pending" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin
  reviewedAt: { type: Date },
  reason: { type: String }, // if rejected
}, { timestamps: true });

module.exports = mongoose.model("KycVerification", KycVerificationSchema);
