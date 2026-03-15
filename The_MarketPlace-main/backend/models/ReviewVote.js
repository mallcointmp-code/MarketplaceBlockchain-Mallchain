const mongoose = require('mongoose');

const ReviewVoteSchema = new mongoose.Schema({
  reviewId: { type: mongoose.Types.ObjectId, ref: 'Review', required: true, index: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
  vote: { type: Number, enum: [1, -1], default: 1 },
  createdAt: { type: Date, default: Date.now }
});

// ensure one vote per user per review
ReviewVoteSchema.index({ reviewId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ReviewVote', ReviewVoteSchema);
