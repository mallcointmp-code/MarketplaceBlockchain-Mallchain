module.exports = (io) => {
  const express = require("express");
  const router = express.Router();
  const Order = require("../models/Order");
  const Notification = require("../models/Notification");
  const authMiddleware = require("../middlewares/authMiddleware");

  // --- Agent Marks Order Delivered ---
  router.post("/deliver/:id", authMiddleware, async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      order.status = "delivered";
      await order.save();

      // Notify buyer
      const notif = new Notification({
        user: order.buyer,
        type: "order",
        message: `Your order #${order._id} has been delivered`,
        link: `/orders/${order._id}`,
      });
      await notif.save();

      io.to(order.buyer.toString()).emit("newNotification", {
        type: "order",
        message: `Order #${order._id} delivered`,
        link: `/orders/${order._id}`,
      });

      res.json(order);
    } catch (err) {
      console.error("Error delivering order:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
};
