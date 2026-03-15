// backend/models/WithdrawalPin.js
const mongoose = require("mongoose");

const WithdrawalPinSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  pinHash: { type: String, required: true }, // store bcrypt hash
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null }, // lockout expiry
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

WithdrawalPinSchema.methods.verifyPin = async function (pin) {
  const bcrypt = require("bcryptjs");
  if (this.lockedUntil && this.lockedUntil > Date.now()) {
    throw new Error("Account locked. Please try again later.");
  }
  const isMatch = await bcrypt.compare(pin, this.pinHash);
  if (!isMatch) {
    await this.incrementFailures();
    return false;
  }
  await this.resetFailures();
  return true;
};

WithdrawalPinSchema.methods.incrementFailures = async function () {
  this.failedAttempts += 1;
  if (this.failedAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lockout
  }
  await this.save();
};

WithdrawalPinSchema.methods.resetFailures = async function () {
  this.failedAttempts = 0;
  this.lockedUntil = null;
  await this.save();
};

module.exports = mongoose.model("WithdrawalPin", WithdrawalPinSchema);
