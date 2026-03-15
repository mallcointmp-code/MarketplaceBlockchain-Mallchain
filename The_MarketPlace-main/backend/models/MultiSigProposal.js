// backend/models/MultiSigProposal.js
const mongoose = require("mongoose");

const MultiSigProposalSchema = new mongoose.Schema({
  proposerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ["Mallmoney","Mallcoins","Mallpoints"], required: true },
  destination: { type: String }, // bank details or wallet address
  approvals: [
    {
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedAt: { type: Date },
    }
  ],
  requiredApprovals: { type: Number, default: 2 },
  status: { type: String, enum: ["pending","approved","rejected","executed"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("MultiSigProposal", MultiSigProposalSchema);
