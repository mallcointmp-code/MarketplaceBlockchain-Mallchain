module.exports = (io) => {
  const express = require("express");
  const router = express.Router();
  const Order = require("../models/Order");
  const Notification = require("../models/Notification");
  const authMiddleware = require("../middlewares/authMiddleware");

  // --- Update Order Status (Admin) ---
  router.post("/update/:id", authMiddleware, async (req, res) => {
    try {
      const { status } = req.body;
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      order.status = status;
      await order.save();

      // Notify buyer
      const notif = new Notification({
        user: order.buyer,
        type: "order",
        message: `Your order #${order._id} status: ${status}`,
        link: `/orders/${order._id}`,
      });
      await notif.save();

      io.to(order.buyer.toString()).emit("newNotification", {
        type: "order",
        message: `Order #${order._id} updated: ${status}`,
        link: `/orders/${order._id}`,
      });

      res.json(order);
    } catch (err) {
      console.error("Error updating order:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
};
