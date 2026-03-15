const mongoose = require('mongoose');

const SearchLogSchema = new mongoose.Schema({
  term: { type: String, index: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', default: null },
  resultsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('SearchLog', SearchLogSchema);
