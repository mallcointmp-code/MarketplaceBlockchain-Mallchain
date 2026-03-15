const Order = require('../models/Order');
const Product = require('../models/Product');
const Ad = require('../models/Ad');
const Review = require('../models/Review');
const Wallet = require('../models/Wallet');

async function overview(req, res) {
  try {
    const sellerId = req.user && req.user._id;
    const todaySales = 0; // replace with real aggregation
    const ordersToday = await Order.countDocuments({ sellerId, createdAt: { $gte: new Date(Date.now() - 24*3600*1000) } });
    const activeAds = await Ad.countDocuments({ creatorId: sellerId, status: "active" });
    const wallet = await Wallet.findOne({ ownerId: sellerId });
    res.json({
      todaySales: `Ksh ${todaySales}`,
      ordersToday,
      activeAds,
      walletBalance: wallet ? `Ksh ${wallet.mallmoney || 0}` : `Ksh 0`
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function salesChart(req, res) {
  try {
    const labels = []; const values = [];
    for (let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); labels.push(d.toLocaleDateString()); values.push(Math.round(Math.random()*5000)); }
    res.json({ labels, values });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function kpis(req, res) {
  try {
    res.json({ conversionRate: 2.5, avgDeliveryMins: 45, returnRate: 1.2, complaintRate: 0.3 });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function reviewsSummary(req, res) {
  try {
    const sellerId = req.user && req.user._id;
    const docs = await Review.find({ targetType: "shop", targetId: sellerId });
    const count = docs.length;
    const avg = count ? (docs.reduce((s,d)=>s+d.rating,0)/count).toFixed(2) : 0;
    res.json({ count, avgRating: avg });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function recentActivity(req, res) {
  try {
    res.json([
      { _id:"1", text:"Order #abc123 placed", createdAt: new Date() },
      { _id:"2", text:"New review added", createdAt: new Date() }
    ]);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = {
  overview,
  salesChart,
  kpis,
  reviewsSummary,
  recentActivity
};
