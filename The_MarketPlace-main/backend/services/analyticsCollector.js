const MarketplaceAnalytics = require('../models/MarketplaceAnalytics.js');
const Product = require('../models/Product.js');
const User = require('../models/User.js');
const Transaction = require('../models/Transaction.js');

async function collectDailyAnalytics() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // Hourly sales
  let hourlySales = [];
  for (let h = 0; h < 24; h++) {
    const hourStart = new Date(start.getTime() + h * 60 * 60 * 1000);
    const hourEnd = new Date(start.getTime() + (h + 1) * 60 * 60 * 1000);
    const count = await Transaction.countDocuments({ type: "sale", createdAt: { $gte: hourStart, $lt: hourEnd } });
    hourlySales.push(count);
  }

  // Category sales
  const categorySales = await Product.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$category", count: { $sum: "$salesCount" } } }
  ]).then(results => results.map(r => ({ category: r._id, count: r.count })));

  // User growth and transaction volume (last 30 days)
  let userGrowth = [], transactionVolume = [];
  for (let d = 0; d < 30; d++) {
    const dayStart = new Date(start.getTime() - d * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(start.getTime() - (d - 1) * 24 * 60 * 60 * 1000);
    userGrowth.unshift(await User.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }));
    transactionVolume.unshift(await Transaction.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }));
  }

  const totalSales = await Transaction.countDocuments({ type: "sale", createdAt: { $gte: start, $lt: end } });
  const totalTransactions = await Transaction.countDocuments({ createdAt: { $gte: start, $lt: end } });
  const newUsers = await User.countDocuments({ createdAt: { $gte: start, $lt: end } });

  const topProducts = await Product.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$_id", sales: { $sum: "$salesCount" } } },
    { $sort: { sales: -1 } },
    { $limit: 5 }
  ]).then(results => results.map(r => r._id));

  const topSellers = await User.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$_id", sales: { $sum: "$salesCount" } } },
    { $sort: { sales: -1 } },
    { $limit: 5 }
  ]).then(results => results.map(r => r._id));

  await MarketplaceAnalytics.create({
    date: start,
    totalSales: hourlySales.reduce((a, b) => a + b, 0),
    totalTransactions: transactionVolume[transactionVolume.length - 1],
    newUsers: userGrowth[userGrowth.length - 1],
    topProducts: [], // Fill as before
    topSellers: [], // Fill as before
    hourlySales,
    categorySales,
    userGrowth,
    transactionVolume
  });
}
// Run daily (e.g., with setInterval or a cron job)
setInterval(collectDailyAnalytics, 24 * 60 * 60 * 1000);

module.exports = collectDailyAnalytics;
module.exports = { MarketplaceAnalytics, Product, User, Transaction, today, start, end, hourStart, hourEnd, count, categorySales, dayStart, dayEnd, totalSales, totalTransactions, newUsers, topProducts, topSellers };