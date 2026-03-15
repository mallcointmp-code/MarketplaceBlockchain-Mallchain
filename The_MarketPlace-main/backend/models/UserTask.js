const mongoose = require("mongoose");

const userTaskSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  proofLink: { type: String },
  status: { type: String, enum: ["taken", "submitted", "approved", "rejected"], default: "taken" },
  reward: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserTask", userTaskSchema);
