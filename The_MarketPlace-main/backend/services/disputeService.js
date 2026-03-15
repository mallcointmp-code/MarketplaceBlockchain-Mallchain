// backend/services/disputeService.js
const Dispute = require("../models/Dispute");
const Order = require("../models/Order");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const DisputeService = {
  async raiseDispute(userId, type, description, relatedTransaction, evidenceFiles = []) {
    const dispute = new Dispute({
      raisedBy: userId,
      relatedTransaction,
      type,
      description,
      evidenceFiles,
    });
    await dispute.save();
    return dispute;
  },

  async resolveDispute(adminEmail, disputeId, resolution, notes) {
    if (adminEmail !== "avastaian36@gmail.com") throw new Error("Unauthorized admin");

    const dispute = await Dispute.findByIdAndUpdate(
      disputeId,
      {
        status: "resolved",
        resolution,
        adminNotes: notes,
        resolvedAt: new Date(),
      },
      { new: true }
    );

    // Optional: Refund transaction if needed
    if (resolution && resolution.includes("refund")) {
      const transaction = await Transaction.findById(dispute.relatedTransaction);
      if (transaction) transaction.status = "refunded";
      if (transaction) await transaction.save();
    }

    return dispute;
  },
};

const resolveDispute = async (disputeId, resolution, adminId) => {
  const dispute = await Dispute.findById(disputeId).populate("relatedOrder");
  if (!dispute) throw new Error("Dispute not found");

  dispute.status = "resolved";
  dispute.resolution = resolution;
  dispute.resolvedBy = adminId;
  dispute.resolvedAt = new Date();
  await dispute.save();

  if (dispute.relatedOrder) {
    dispute.relatedOrder.disputeResolved = true;
    await dispute.relatedOrder.save();
  }

  return dispute;
};

const refundBuyer = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const buyerWallet = await Wallet.findOne({ userId: order.buyer });
  if (!buyerWallet) throw new Error("Wallet not found");

  buyerWallet.mallmoney += order.totalAmount;
  await buyerWallet.save();

  order.status = "refunded";
  await order.save();

  return order;
};

module.exports = {
  DisputeService,
  resolveDispute,
  refundBuyer,
};
