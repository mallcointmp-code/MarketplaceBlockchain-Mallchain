const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TxSchema = new Schema({
  from: { type: String, required: true },
  to: { type: String },
  amount: { type: Number, required: true },
  type: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tx', TxSchema);
