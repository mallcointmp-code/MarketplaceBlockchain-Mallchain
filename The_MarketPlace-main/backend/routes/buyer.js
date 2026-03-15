module.exports = (io) => {
  const express = require("express");
  const router = express.Router();
  const Order = require("../models/Order");
  const Notification = require("../models/Notification");
  const authMiddleware = require("../middlewares/authMiddleware");

  // --- Place Order ---
  router.post("/order", authMiddleware, async (req, res) => {
    try {
      const { items, seller, total } = req.body;

      const order = new Order({
        buyerId: req.user.userId,
        seller,
        items,
        total,
        status: "pending_payment",
      });

      await order.save();

      // Notify seller
      const notif = new Notification({
        user: seller,
        type: "order",
        message: `New order #${order._id} from ${req.user.name}`,
        link: `/orders/${order._id}`,
      });
      await notif.save();

      io.to(seller.toString()).emit("newNotification", {
        type: "order",
        message: `New order from ${req.user.name}`,
        link: `/orders/${order._id}`,
      });

      res.json(order);
    } catch (err) {
      console.error("Error placing order:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
};
