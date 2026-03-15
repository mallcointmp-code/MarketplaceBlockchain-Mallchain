const axios = require('axios')

const CHAIN_REST = process.env.CHAIN_REST || 'http://127.0.0.1:1317'

exports.list = async (req, res) => {
  res.json({ txs: [] })
}

exports.get = async (req, res) => {
  res.json({ id: req.params.id })
}

exports.create = async (req, res) => {
  // existing authenticated create flow (not implemented here)
  res.status(201).json({ created: true })
}

exports.relay = async (req, res) => {
  // Accept signed tx JSON and forward to chain REST (gateway) endpoint
  // Expected body: { creator, to, amount, signature, public_key }
  try{
    const signed = req.body
    const url = `${CHAIN_REST}/tmp/marketplace/mlcoin/v1/transfer`
    const r = await axios.post(url, signed)
    res.json({ forwarded: true, resp: r.data })
  }catch(e){
    console.error('relay error', e.message || e)
    res.status(502).json({ error: 'relay_failed', detail: e.message })
  }
}
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
