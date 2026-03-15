// backend/controllers/auditController.js
const WalletTransaction = require('../models/WalletTransaction.js');

const listTransactions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Number(req.query.limit || 50));
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.type) filter.type = req.query.type;

    const data = await WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await WalletTransaction.countDocuments(filter);

    res.json({ data, meta: { page, limit, total } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
};

// Export for CommonJS
module.exports = { listTransactions };
