const mongoose = require("mongoose");

const TaskCompletionSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    proof: { type: String }, // could be screenshot URL, or auto verification log
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    reward: { type: Number, default: 0 }, // Mallpoints earned
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TaskCompletion", TaskCompletionSchema);
