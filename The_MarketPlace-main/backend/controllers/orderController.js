const Order = require('../models/Order.js');

const createOrder = async (req, res) => {
  try {
    const payload = req.body;
    const order = new Order(payload);
    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

const listOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 }).limit(500);
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list orders" });
  }
};

const getOrder = async (req, res) => {
  try {
    const o = await Order.findById(req.params.id);
    if (!o) return res.status(404).json({ error: "Not found" });
    res.json(o);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get order" });
  }
};

const updateOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
};

module.exports = { Order, createOrder, listOrders, getOrder, updateOrder };