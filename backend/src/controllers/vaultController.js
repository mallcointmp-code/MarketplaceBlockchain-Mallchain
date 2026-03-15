const Vault = require('../models/vault');

exports.list = async (req, res) => {
  const items = await Vault.find().sort({ createdAt: -1 }).limit(100);
  res.json(items);
};

exports.get = async (req, res) => {
  const v = await Vault.findById(req.params.id);
  if (!v) return res.status(404).json({ error: 'not found' });
  res.json(v);
};

exports.create = async (req, res) => {
  const { authority, data } = req.body;
  if (!authority) return res.status(400).json({ error: 'authority required' });
  const v = await Vault.create({ authority, data, status: 'pending' });
  res.status(201).json(v);
};

exports.update = async (req, res) => {
  const v = await Vault.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!v) return res.status(404).json({ error: 'not found' });
  res.json(v);
};

exports.remove = async (req, res) => {
  await Vault.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
