const express = require('express');
const router = express.Router();

// Simple in-memory demo transactions for three assets
const now = Date.now();
const demoTx = [
  {
    id: 'tx-mallcoin-1',
    type: 'message',
    title: 'MallCoin received',
    body: 'You have received MallCoins from referral bonus.',
    amount: 150,
    currency: 'MallCoin',
    fundSource: 'MallCoin',
    balanceAfter: 1150,
    from: 'Referral Bonus',
    receivedAt: new Date(now - (2 * 60 * 60 * 1000)).toISOString(),
    userId: 'me'
  },
  {
    id: 'tx-mallmoney-1',
    type: 'message',
    title: 'Mallmoney received',
    body: 'Payment received into your Mallmoney wallet.',
    amount: 2500,
    currency: 'Mallmoney',
    fundSource: 'Mallmoney',
    balanceAfter: 12500,
    from: 'Seller: Acme Store',
    receivedAt: new Date(now - (60 * 60 * 1000)).toISOString(),
    userId: 'me'
  },
  {
    id: 'tx-mallpoints-1',
    type: 'message',
    title: 'Mallpoints earned',
    body: 'You earned Mallpoints for completing a task.',
    amount: 40,
    currency: 'Mallpoints',
    fundSource: 'Mallpoints',
    balanceAfter: 420,
    from: 'Task Rewards',
    receivedAt: new Date(now - (30 * 60 * 1000)).toISOString(),
    userId: 'me'
  }
];

// GET /transactions - return all demo transactions
router.get('/transactions', (req, res) => {
  res.json({ success: true, data: demoTx });
});

// GET /transactions/:id - single transaction
router.get('/transactions/:id', (req, res) => {
  const id = req.params.id;
  const tx = demoTx.find(t => t.id === id);
  if (!tx) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
  res.json({ success: true, data: tx });
});

module.exports = router;
