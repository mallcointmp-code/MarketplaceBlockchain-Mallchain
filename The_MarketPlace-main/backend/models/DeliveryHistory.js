
const mongoose = require('mongoose');

const DeliveryHistorySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryTask', required: false, index: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryAgent', required: false },
  events: [{
    ts: { type: Date, default: Date.now },
    type: { type: String },
    note: String,
    location: { lat: Number, lng: Number }
  }],
  amountPaid: { type: Number, default: 0 },
  agentPayout: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  status: { type: String, default: 'completed' },
  durationSec: { type: Number, default: 0 },
  expectedDurationSec: { type: Number, default: 0 },
  reasonTags: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.models.DeliveryHistory || mongoose.model('DeliveryHistory', DeliveryHistorySchema);

module.exports = { mongoose, DeliveryHistorySchema, mongoose, DeliveryHistorySchema };