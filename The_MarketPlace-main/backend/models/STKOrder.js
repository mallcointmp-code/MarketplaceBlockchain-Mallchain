const mongoose = require('mongoose');

const STKOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  checkoutRequestID: { type: String, index: true },
  mpesaResponse: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['pending','success','failed','timeout'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

STKOrderSchema.index({ checkoutRequestID: 1 });

module.exports = mongoose.models.STKOrder || mongoose.model("STKOrder", STKOrderSchema);

module.exports = { mongoose, STKOrderSchema };