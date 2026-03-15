const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "OrthopharmEmployee" },
  service: String,
  date: Date,
  status: { type: String, enum: ["pending", "accepted", "rejected", "completed"], default: "pending" },
  notes: String
});

module.exports = mongoose.model("OrthopharmAppointment", appointmentSchema);