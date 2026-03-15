const mongoose = require('mongoose');

const DeliveryAgentSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, unique: true },
  displayName: String,
  phone: String,
  email: String,
  vehicle: {
    type: { type: String, enum: ['bike','motorbike','car','van','truck','on-foot'], default: 'motorbike' },
    regNumber: String
  },
  rating: { type: Number, default: 5.0 },
  online: { type: Boolean, default: false },
  // GeoJSON last location: { type: 'Point', coordinates: [lng, lat] }
  lastLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    updatedAt: Date
  },
  totalCompleted: { type: Number, default: 0 },
  penaltyCount: { type: Number, default: 0 },
  earningsBalance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

DeliveryAgentSchema.index({ userId: 1 });
DeliveryAgentSchema.index({ lastLocation: '2dsphere' });

module.exports = mongoose.model('DeliveryAgent', DeliveryAgentSchema);
