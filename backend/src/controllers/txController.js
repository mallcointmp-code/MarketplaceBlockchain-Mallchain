const Tx = require('../models/transaction');

exports.list = async (req, res) => {
  const items = await Tx.find().sort({ createdAt: -1 }).limit(200);
  res.json(items);
};

exports.create = async (req, res) => {
  const { from, to, amount, type, metadata } = req.body;
  if (!from || !amount) return res.status(400).json({ error: 'from and amount required' });
  const tx = await Tx.create({ from, to, amount, type, metadata });
  res.status(201).json(tx);
};

exports.get = async (req, res) => {
  const t = await Tx.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
};
