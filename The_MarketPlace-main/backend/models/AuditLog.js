const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  target: { type: mongoose.Schema.Types.Mixed }, // ID of the affected document (transaction, product, etc.)
  action: String,
  details: mongoose.Schema.Types.Mixed,
  ip: String,
  timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
module.exports = AuditLog;