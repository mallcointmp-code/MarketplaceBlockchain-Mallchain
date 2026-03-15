const express = require('express');
const adminOnly = require('../middlewares/adminOnly.js');
const AuditLog = require('../models/AuditLog.js');
const User = require('../models/User.js');
const Product = require('../models/Product.js');
const Job = require('../models/JobListing.js');
const Badge = require('../models/Badge.js');
const Announcement = require('../models/Announcement.js');
const Order = require('../models/Order.js');
const Wallet = require('../models/Wallet.js');
const Transaction = require('../models/Transaction.js');
const adminAnalytics = require('../controllers/adminAnalyticsController.js');
const penaltyCtrl = require('../controllers/penaltyController.js');

const { authMiddleware } = require('../middlewares/authMiddleware.js');

const router = express.Router();

// All admin routes require authentication
router.use(authMiddleware);

// Ban user
router.post("/ban-user/:id", adminOnly, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { banned: true });
  await AuditLog.create({
    admin: req.user._id,
    action: "ban_user",
    target: user._id,
    details: { reason: req.body.reason }
  });
  res.json({ success: true, message: "User banned", user });
});

// Promote user to admin
router.post("/promote-user/:id", adminOnly, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { role: 'admin' }, { new: true });
  await AuditLog.create({
    admin: req.user._id,
    action: "promote_admin",
    target: user._id,
    details: {}
  });
  res.json({ success: true, message: "User promoted to Admin", user });
});

// Unban user
router.post("/unban-user/:id", adminOnly, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { banned: false });
  await AuditLog.create({
    admin: req.user._id,
    action: "unban_user",
    target: user._id,
    details: {}
  });
  res.json({ success: true, message: "User unbanned", user });
});

// Delete product
router.delete("/product/:id", adminOnly, async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  await AuditLog.create({
    admin: req.user._id,
    action: "delete_product",
    target: product ? product._id : req.params.id,
    details: {}
  });
  res.json({ success: true, message: "Product deleted", product });
});

// Approve job posting
router.post("/approve-job/:id", adminOnly, async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, { approved: true });
  await AuditLog.create({
    admin: req.user._id,
    action: "approve_job",
    target: job._id,
    details: {}
  });
  res.json({ success: true, message: "Job approved", job });
});

// Reject job posting
router.post("/reject-job/:id", adminOnly, async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, { approved: false });
  await AuditLog.create({
    admin: req.user._id,
    action: "reject_job",
    target: job._id,
    details: { reason: req.body.reason }
  });
  res.json({ success: true, message: "Job rejected", job });
});

// Badge routes
router.post("/badge", adminOnly, async (req, res) => {
  const badge = await Badge.create(req.body);
  await AuditLog.create({
    admin: req.user._id,
    action: "create_badge",
    target: badge._id,
    details: req.body
  });
  res.json({ success: true, message: "Badge created", badge });
});

router.put("/badge/:id", adminOnly, async (req, res) => {
  const badge = await Badge.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await AuditLog.create({
    admin: req.user._id,
    action: "update_badge",
    target: badge._id,
    details: req.body
  });
  res.json({ success: true, message: "Badge updated", badge });
});

router.delete("/badge/:id", adminOnly, async (req, res) => {
  const badge = await Badge.findByIdAndDelete(req.params.id);
  await AuditLog.create({
    admin: req.user._id,
    action: "delete_badge",
    target: badge ? badge._id : req.params.id,
    details: {}
  });
  res.json({ success: true, message: "Badge deleted", badge });
});

// Announcement routes
router.post("/announcement", adminOnly, async (req, res) => {
  const announcement = await Announcement.create({
    title: req.body.title,
    message: req.body.message,
    expiresAt: req.body.expiresAt
  });
  await AuditLog.create({
    admin: req.user._id,
    action: "broadcast_announcement",
    target: announcement._id,
    details: req.body
  });
  res.json({ success: true, message: "Announcement broadcasted", announcement });
});

router.get("/announcements", adminOnly, async (req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, announcements });
});

// Analytics
router.get("/analytics/summary", adminOnly, adminAnalytics.summary);
router.get("/analytics/timeseries", adminOnly, adminAnalytics.timeseries);

// Penalty routes
router.post('/penalty', adminOnly, penaltyCtrl.createPenalty);
router.get('/penalties', adminOnly, penaltyCtrl.listPenalties);

// Global Order Management
router.get("/orders", adminOnly, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, orders });
});

// System Diagnostics
router.get("/diagnostics", adminOnly, async (req, res) => {
  const results = [];

  // 1. MongoDB
  try {
    const mongoose = require('mongoose');
    const state = mongoose.connection.readyState;
    results.push({ name: "Database", status: state === 1 ? "optimal" : "error", message: state === 1 ? "Connected to MongoDB" : "Connection unstable", metric: `${state}` });
  } catch (e) { results.push({ name: "Database", status: "error", message: e.message }); }

  // 2. Redis
  try {
    const redis = req.app.get('redis');
    if (redis) {
      await redis.ping();
      results.push({ name: "Redis Cache", status: "optimal", message: "Cache layer operational", metric: "Active" });
    } else {
      results.push({ name: "Redis Cache", status: "warning", message: "Redis not configured, using in-memory" });
    }
  } catch (e) { results.push({ name: "Redis Cache", status: "error", message: e.message }); }

  // 3. Blockchain (ethService)
  try {
    const ethService = require('../services/ethService');
    const provider = ethService.provider();
    if (provider) {
      const block = await provider.getBlockNumber();
      results.push({ name: "Blockchain", status: "optimal", message: "Node synced", metric: `Block ${block}` });
    } else {
      results.push({ name: "Blockchain", status: "warning", message: "Provider not initialized" });
    }
  } catch (e) { results.push({ name: "Blockchain", status: "error", message: e.message }); }

  // 4. M-Pesa API
  try {
    // Check if credentials exist at least
    const hasCreds = !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET);
    results.push({ name: "M-Pesa API", status: hasCreds ? "optimal" : "warning", message: hasCreds ? "Credentials configured" : "API keys missing" });
  } catch (e) { results.push({ name: "M-Pesa API", status: "error", message: e.message }); }

  // 5. Email Service
  try {
    const hasMail = !!(process.env.SENDGRID_API_KEY || process.env.SMTP_HOST);
    results.push({ name: "Email Service", status: hasMail ? "optimal" : "warning", message: hasMail ? "Mail provider active" : "No mail config" });
  } catch (e) { results.push({ name: "Email Service", status: "error", message: e.message }); }

  res.json({ success: true, results, timestamp: new Date().toISOString() });
});

// Health check for latency measurements
router.get("/health", adminOnly, (req, res) => {
  res.status(200).json({ success: true, timestamp: Date.now() });
});

/**
 * FINANCIAL RECOVERY: Revert a specific transaction
 * This will reverse the balance change and mark the transaction as failed/reverted.
 */
router.post("/revert-transaction/:id", adminOnly, async (req, res) => {
  try {
    const WalletTransaction = require('../models/WalletTransaction.js');
    const { runInTransaction } = require('../utils/transactionHelper.js');

    // Find the primary transaction to revert
    let tx = await Transaction.findById(req.params.id) || await WalletTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    if (tx.status !== 'completed') return res.status(400).json({ error: `Cannot revert transaction with status: ${tx.status || 'unknown'}. Only completed transactions can be reverted.` });

    await runInTransaction(async (session) => {
      // Find all transactions that need to be reverted
      // If it has a transferId, we revert both sides
      let txsToRevert = [tx];
      const transferId = tx.meta?.transferId;

      if (transferId) {
        const linkedTx = await WalletTransaction.findOne({
          _id: { $ne: tx._id },
          "meta.transferId": transferId,
          status: 'completed'
        }).session(session);
        if (linkedTx) txsToRevert.push(linkedTx);
      } else {
        // Fallback for older P2P transactions without transferId:
        // If type is send/receive, look for matching amount/date/users
        if (tx.type === 'send' || tx.type === 'receive') {
          const oppositeType = tx.type === 'send' ? 'receive' : 'send';
          const linkedTx = await WalletTransaction.findOne({
            _id: { $ne: tx._id },
            type: oppositeType,
            amount: tx.amount,
            status: 'completed',
            createdAt: { $gte: new Date(tx.createdAt.getTime() - 5000), $lte: new Date(tx.createdAt.getTime() + 5000) }
          }).session(session);
          if (linkedTx) txsToRevert.push(linkedTx);
        }
      }

      for (const t of txsToRevert) {
        // Find wallet
        let wallet;
        if (t.walletId) {
          wallet = await Wallet.findById(t.walletId).session(session);
        } else {
          wallet = await Wallet.findOne({ ownerId: t.ownerId || t.userId }).session(session);
        }

        if (wallet) {
          const deductionTypes = ['purchase', 'withdraw', 'send', 'payment', 'campaign_spend', 'buy_mallcoin', 'task_charge'];
          const additionTypes = ['deposit', 'receive', 'earn_points', 'roi', 'sell_mallcoin', 'mpesa_stk_push', 'task_reward', 'conversion'];
          const currencyKey = (t.currency || 'KSH').toLowerCase().includes('coin') ? 'mallcoins' :
            (t.currency || 'KSH').toLowerCase().includes('point') ? 'mallpoints' : 'mallmoney';

          if (deductionTypes.includes(t.type)) {
            wallet[currencyKey] += t.amount;
          } else if (additionTypes.includes(t.type)) {
            wallet[currencyKey] -= t.amount;
          }

          t.status = 'failed';
          t.meta = { ...t.meta, revertedAt: new Date(), revertedBy: req.user._id };

          await wallet.save({ session });
          await t.save({ session });

          // Notify sockets
          try {
            const io = req.app.get("io");
            if (io) {
              io.to(`user:${wallet.userId || wallet.ownerId}`).emit("wallet:update", {
                userId: wallet.userId || wallet.ownerId,
                mallmoney: wallet.mallmoney,
                mallcoins: wallet.mallcoins,
                mallpoints: wallet.mallpoints
              });
            }
          } catch (e) { /* ignore */ }
        }
      }

      await AuditLog.create([{
        admin: req.user._id,
        action: "revert_transaction",
        target: tx._id,
        details: { count: txsToRevert.length, transferId, originalId: tx._id }
      }], { session });

      req.app.get("io")?.emit("ledger:update");
    });

    res.json({ success: true, message: "Transaction(s) reverted successfully" });
  } catch (err) {
    console.error("Reversion failed", err);
    res.status(500).json({ error: err.message || "Reversion failed" });
  }
});

/**
 * FINANCIAL RECOVERY: Refund an Order
 * This marks the order as refunded and returns the total amount to the buyer.
 */
router.post("/refund-order/:id", adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status === 'refunded') return res.status(400).json({ error: "Order already refunded" });

    const wallet = await Wallet.findOne({ ownerId: order.buyerId });
    if (!wallet) return res.status(404).json({ error: "Buyer wallet not found" });

    const currencyKey = order.paymentMethod === 'mallcoins' ? 'mallcoins' :
      order.paymentMethod === 'mallpoints' ? 'mallpoints' : 'mallmoney';

    wallet[currencyKey] += order.total;
    order.status = 'refunded';

    await wallet.save();
    await order.save();

    // Record the refund transaction
    await Transaction.create({
      walletId: wallet._id,
      userId: order.buyerId,
      type: 'receive',
      amount: order.total,
      currency: order.paymentMethod.includes('coin') ? 'Mallcoins' :
        order.paymentMethod.includes('point') ? 'Mallpoints' : 'KES',
      meta: { orderId: order._id, reason: 'Admin Refund' },
      status: 'completed'
    });

    await AuditLog.create({
      admin: req.user._id,
      action: "refund_order",
      target: order._id,
      details: { buyerId: order.buyerId, amount: order.total }
    });

    res.json({ success: true, message: "Order refunded successfully", newBalance: wallet[currencyKey] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Refund failed" });
  }
});

router.get("/audit-logs", adminOnly, async (req, res) => {
  try {
    const logs = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('admin', 'fullName username email')
      .populate('user', 'fullName username email');
    res.json({ ok: true, logs });
  } catch (err) {
    console.error("audit-logs err", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

module.exports = router;
