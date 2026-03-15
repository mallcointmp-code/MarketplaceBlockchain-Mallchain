const mongoose = require('mongoose');

const CareerSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    position: { type: String, required: true },
    description: { type: String },
    requirements: [{ type: String }],
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Career || mongoose.model("Career", CareerSchema);

module.exports = { mongoose, CareerSchema };