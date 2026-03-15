const mongoose = require('mongoose');

const DeliveryLogSchema = new mongoose.Schema({
  taskId: { type: mongoose.Types.ObjectId, ref: 'DeliveryTask' },
  actor: { type: mongoose.Types.ObjectId, ref: 'User' },
  action: String,
  meta: Object,
  ts: { type: Date, default: Date.now }
});

module.exports = mongoose.models.DeliveryLog || mongoose.model('DeliveryLog', DeliveryLogSchema);

module.exports = { mongoose, DeliveryLogSchema };