const mongoose = require('mongoose');

const ConversionRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
  mallpoints: { type: Number, required: true },
  mallcoins: { type: Number, required: true },
  rate: { type: Number, required: true },
  convertedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ConversionRecord || mongoose.model('ConversionRecord', ConversionRecordSchema);
