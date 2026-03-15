const WalletTransaction = require('../models/WalletTransaction.js');
const Wallet = require('../models/Wallet.js');
const User = require('../models/User.js');
const Transaction = require('../models/Transaction.js');

async function summary(req, res) {
  try {
    // Aggregates from WalletTransaction
    const wTotalDeposits = await WalletTransaction.aggregate([
      { $match: { type: "deposit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const wTotalWithdrawals = await WalletTransaction.aggregate([
      { $match: { type: "withdraw", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // Aggregates from Transaction (M-Pesa etc)
    const tTotalDeposits = await Transaction.aggregate([
      { $match: { type: "deposit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const tTotalWithdrawals = await Transaction.aggregate([
      { $match: { type: "withdraw", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const topSellers = await Wallet.find({})
      .sort({ mallmoney: -1 })
      .limit(10)
      .lean();

    const last24h = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const [wTxCount, tTxCount] = await Promise.all([
      WalletTransaction.countDocuments({ createdAt: { $gte: last24h } }),
      Transaction.countDocuments({ createdAt: { $gte: last24h } })
    ]);

    const userCount = await User.countDocuments();
    console.log(`[Analytics] Total Users: ${userCount}, wTxCount: ${wTxCount}, tTxCount: ${tTxCount}`);

    const deposits = ((wTotalDeposits[0] && wTotalDeposits[0].total) || 0) + ((tTotalDeposits[0] && tTotalDeposits[0].total) || 0);
    const withdrawals = ((wTotalWithdrawals[0] && wTotalWithdrawals[0].total) || 0) + ((tTotalWithdrawals[0] && tTotalWithdrawals[0].total) || 0);

    // Also include other types in total volume (Money moving through the platform)
    // We include buy_mallcoin, send, receive, p2p etc.
    const wVolume = await WalletTransaction.aggregate([
      { $match: { type: { $in: ["receive", "send", "transfer", "p2p", "top_up", "admin_credit"] }, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalVolume = deposits + ((wVolume[0] && wVolume[0].total) || 0);
    console.log(`[Analytics] Calculated Deposits/Volume: ${totalVolume}, Withdrawals: ${withdrawals}`);

    res.json({
      success: true,
      data: {
        deposits: totalVolume, // Map totalVolume to deposits for the 'Volume' UI card
        withdrawals,
        topSellers,
        txCountLast24h: wTxCount + tTxCount,
        totalUsers: userCount
      }
    });
  } catch (err) {
    console.error("admin summary err", err);
    res.status(500).json({ success: false, message: "Failed to fetch summary" });
  }
}

async function timeseries(req, res) {
  try {
    const days = Math.min(90, Number(req.query.days || 30));
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    const matchPipe = { $match: { createdAt: { $gte: since }, status: "completed" } };
    const projectPipe = { $project: { amount: 1, type: 1, day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } } };
    const groupPipe = { $group: { _id: { day: "$day", type: "$type" }, total: { $sum: "$amount" } } };

    const [wSeries, tSeries] = await Promise.all([
      WalletTransaction.aggregate([matchPipe, projectPipe, groupPipe]),
      Transaction.aggregate([matchPipe, projectPipe, groupPipe])
    ]);

    const out = {};
    const process = (series) => {
      series.forEach(s => {
        const day = s._id.day;
        const type = s._id.type;
        out[day] = out[day] || {};
        out[day][type] = (out[day][type] || 0) + s.total;
      });
    };

    process(wSeries);
    process(tSeries);

    const sortedOut = Object.keys(out)
      .sort()
      .reduce((acc, key) => {
        acc[key] = out[key];
        return acc;
      }, {});

    res.json({ success: true, data: { series: sortedOut } });
  } catch (err) {
    console.error("timeseries err", err);
    res.status(500).json({ success: false, message: "Failed to fetch timeseries" });
  }
}

module.exports = { summary, timeseries };