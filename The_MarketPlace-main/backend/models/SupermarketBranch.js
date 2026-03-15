const mongoose = require('mongoose');

const SupermarketBranchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String },
  tillNumber: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SupermarketBranch', SupermarketBranchSchema);
