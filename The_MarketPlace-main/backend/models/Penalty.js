const mongoose = require('mongoose');

const PenaltySchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryAgent', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryTask' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, default: 0 },
  reason: { type: String, required: true },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Penalty', PenaltySchema);
