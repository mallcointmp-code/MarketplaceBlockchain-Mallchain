const mongoose = require('mongoose');

const TaskParticipationSchema = new mongoose.Schema({
  taskId: { type: mongoose.Types.ObjectId, ref: 'TaskCampaign', required: true, index: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['started','verified','rejected','rewarded'], default: 'started' },
  startedAt: { type: Date, default: Date.now },
  verifiedAt: Date,
  rewardedAt: Date,
  meta: { type: mongoose.Schema.Types.Mixed }
});

TaskParticipationSchema.index({ taskId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.models.TaskParticipation || mongoose.model('TaskParticipation', TaskParticipationSchema);
