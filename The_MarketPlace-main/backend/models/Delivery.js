const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: [
        "preparing",
        "picked_up",
        "in_transit",
        "delayed",
        "out_for_delivery",
        "failed_attempt",
        "delivered",
        "cancelled"
      ],
      default: "preparing"
    },
    trackingNumber: { type: String, default: null },
    estimatedDelivery: { type: Date, default: null },
    timeline: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        note: { type: String, default: null }
      }
    ]
  },
  { timestamps: true }
);

deliverySchema.index({ agent: 1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ updatedAt: -1 });

module.exports = mongoose.models.Delivery || mongoose.model("Delivery", deliverySchema);
module.exports = { mongoose, deliverySchema };