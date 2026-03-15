// backend/models/Badge.js
const mongoose = require("mongoose");

const BadgeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    priceKsh: { type: Number, required: true }, // e.g., Ksh 23
    benefits: [{ type: String }], // ["convert MLPTS", "apply for jobs"]
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BadgeSchema.index({ priceKsh: 1 });

module.exports =
  mongoose.models.Badge || mongoose.model("Badge", BadgeSchema);


// Transaction example (not part of the model file, just for reference)
// const session = await Model.startSession();
// session.startTransaction();
// try {
//   // ...find, update, create with .session(session)...
//   await session.commitTransaction();
//   session.endSession();
//   res.json({ ... });
// } catch (err) {
//   await session.abortTransaction();
//   session.endSession();
//   res.status(500).json({ error: "Server error" });
// }
