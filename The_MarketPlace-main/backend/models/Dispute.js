const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  againstUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  relatedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  type: { type: String, enum: ["order", "task", "job"], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  evidence: [{ type: String }], // URLs to images/docs
  status: { type: String, enum: ["open", "under_review", "resolved", "rejected"], default: "open" },
  resolution: { type: String },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  adminNotes: { type: String },
  evidenceFiles: [String],
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.Dispute || mongoose.model("Dispute", disputeSchema);

module.exports = { mongoose, disputeSchema };