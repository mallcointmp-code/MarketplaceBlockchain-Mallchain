// backend/models/DeliveryTask.js
const mongoose = require('mongoose');

const LocationSub = new mongoose.Schema({
  address: String,
  lat: Number,
  lng: Number
}, { _id: false });

const DeliveryTaskSchema = new mongoose.Schema({
  orderId: { type: mongoose.Types.ObjectId, ref: "Order" },
  buyerId: { type: mongoose.Types.ObjectId, ref: "User" },
  sellerId: { type: mongoose.Types.ObjectId, ref: "User" },
  pickupLocation: { address: String, lat: Number, lng: Number },
  dropoffLocation: { address: String, lat: Number, lng: Number },
  assignedAgentId: { type: mongoose.Types.ObjectId, ref: "DeliveryAgent", default: null },
  status: { type: String, enum: ["unassigned", "assigned", "accepted", "enroute_pickup", "picked_up", "enroute_dropoff", "delivered", "failed", "cancelled"], default: "unassigned" },
  fee: { type: Number, default: 0 },
  agentPayout: { type: Number, default: 0 },
  pickedAt: Date,
  deliveredAt: Date,
  expectedDurationSec: Number,
  actualDurationSec: Number,
  routePolylineEncoded: String,
  routePolylineCoords: [{ lat: Number, lng: Number }],
  reasonTags: [String],
  proof: { pickupPhoto: String, dropoffPhoto: String, signatureImage: String },
  rating: {
    buyerRating: { type: Number },
    sellerRating: { type: Number },
    buyerComment: { type: String },
    sellerComment: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

DeliveryTaskSchema.index({ assignedAgentId: 1, status: 1 });
DeliveryTaskSchema.index({ status: 1, assignedAgentId: 1, createdAt: -1 });

const DeliveryTask = mongoose.model("DeliveryTask", DeliveryTaskSchema);
module.exports = DeliveryTask;