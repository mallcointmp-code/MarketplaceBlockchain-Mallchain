const mongoose = require('mongoose');

const MigrationResultSchema = new mongoose.Schema({
  taskId: { type: mongoose.Types.ObjectId, ref: "DeliveryTask", required: true, index: true },
  attempt: { type: Number, default: 0 },
  success: { type: Boolean, default: false },
  reason: { type: String, default: "" },
  notes: { type: String, default: "" },
  origin: {
    lat: Number, lng: Number
  },
  destination: {
    lat: Number, lng: Number
  },
  routeEncoded: { type: String, default: null },
  routeCoordsLength: { type: Number, default: 0 },
  durationSec: { type: Number },
  distanceMeters: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

MigrationResultSchema.index({ taskId: 1, success: 1, createdAt: -1 });

module.exports = mongoose.model("MigrationResult", MigrationResultSchema);

module.exports = { mongoose, MigrationResultSchema };