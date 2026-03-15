const express = require('express');
const mongoose = require('mongoose');
const TaskCampaign = require('../models/TaskCampaign');
const TaskParticipation = require('../models/TaskParticipation');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const { runInTransaction } = require('../utils/transactionHelper.js');

function emitBalanceUpdate(app, wallet) {
  try {
    const io = app.get("io");
    if (!io) return;
    io.to(`user:${wallet.userId || wallet.ownerId}`).emit("wallet:update", {
      userId: wallet.userId || wallet.ownerId,
      mallmoney: wallet.mallmoney,
      mallcoins: wallet.mallcoins,
      mallpoints: wallet.mallpoints
    });
  } catch (err) { console.warn("emitBalanceUpdate err", err); }
}

/** Create a new task campaign (publisher spends MallPoints up-front) */
async function createTask(req, res) {
  try {
    const { title, platform, action, link, rewardPerAction, budget, expiresAt } = req.body;
    if (!title || !platform || !action || !budget) return res.status(400).json({ error: 'missing' });
    const publisherId = req.user && req.user._id;
    if (!publisherId) return res.status(401).json({ error: 'unauth' });

    await runInTransaction(async (session) => {
      const wallet = await Wallet.findOne({ ownerId: publisherId }).session(session);
      if (!wallet || (wallet.mallpoints || 0) < budget) {
        throw new Error('insufficient mallpoints');
      }

      // If rewardPerAction not provided, try to populate a sensible default from admin config
      let reward = rewardPerAction;
      try {
        const PlatformConfig = require('../models/PlatformConfig');
        if (!reward) {
          const key = `rate:${platform}:${action}`;
          const cfg = await PlatformConfig.findOne({ key }).lean();
          if (cfg && cfg.value) reward = Number(cfg.value || 0);
        }
      } catch (e) { /* ignore */ }
      if (!reward) throw new Error('rewardPerAction missing and no default configured');

      wallet.mallpoints = Number((wallet.mallpoints - budget).toFixed(4));
      await wallet.save({ session });

      const tx = new WalletTransaction({ ownerId: publisherId, type: 'task_charge', amount: -budget, currency: 'MLPTS', balanceBefore: (wallet.mallpoints + budget), balanceAfter: wallet.mallpoints, meta: { note: 'task budget reserved' } });
      await tx.save({ session });

      const campaign = new TaskCampaign({ title, publisherId, platform, action, link, rewardPerAction: reward, budget, remaining: budget, expiresAt });
      await campaign.save({ session });

      emitBalanceUpdate(req.app, wallet);

      return res.json({ ok: true, campaign });
    });
  } catch (err) {
    if (err.message === 'insufficient mallpoints' || err.message === 'rewardPerAction missing and no default configured') {
      return res.status(400).json({ error: err.message });
    }
    console.error('createTask err', err);
    res.status(500).json({ error: 'create failed' });
  }
}

/** List active tasks */
async function listTasks(req, res) {
  try {
    const q = { status: 'active' };
    const tasks = await TaskCampaign.find(q).sort({ createdAt: -1 }).limit(100).lean();
    res.json(tasks);
  } catch (err) {
    console.error('listTasks err', err);
    res.status(500).json({ error: 'failed' });
  }
}

/** Start task - create participation record. Prevent repeats via unique index. */
async function startTask(req, res) {
  try {
    const taskId = req.params.id;
    const userId = req.user && req.user._id;
    if (!taskId || !userId) return res.status(400).json({ error: 'missing' });

    // anti-fraud checks: prevent same user, same IP, or same device from starting repeatedly
    const anti = require('../utils/antiFraud');
    const ip = req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0];
    const fingerprint = req.headers['x-device-fingerprint'] || req.body.deviceFingerprint || null;

    const existing = await TaskParticipation.findOne({ taskId, userId }).lean();
    if (existing) return res.status(400).json({ error: 'already participated' });

    const ipAllowed = await anti.checkIpTaskAllowed(req.app, taskId, ip);
    if (!ipAllowed) return res.status(429).json({ error: 'Too many requests from this IP' });
    if (fingerprint) {
      const devAllowed = await anti.checkDeviceTaskAllowed(req.app, taskId, fingerprint);
      if (!devAllowed) return res.status(429).json({ error: 'Device flagged for this task' });
    }

    const p = new TaskParticipation({ taskId, userId, status: 'started', meta: { ip, fingerprint } });
    await p.save();

    // sign a short-lived participation token for verification to reduce fake callbacks
    try {
      const signer = require('../utils/signedLink');
      const token = signer.signPayload({ participationId: String(p._id), expiresAt: Date.now() + (1000 * 60 * 30) }); // 30m
      p.meta.signedToken = token;
      await p.save();
      // mark cooldown keys so others from same ip/device cannot start immediately
      try { await anti.markIpTaskCooldown(req.app, taskId, ip, anti.DEFAULT_COOLDOWN_SECONDS); } catch (e) { }
      if (fingerprint) try { await anti.markDeviceTaskCooldown(req.app, taskId, fingerprint, anti.DEFAULT_COOLDOWN_SECONDS); } catch (e) { }
      // Return token for the client to include in verification callback
      res.json({ ok: true, participationId: p._id, verificationToken: token });
    } catch (e) {
      console.error('sign token err', e);
      res.json({ ok: true, participationId: p._id });
    }
  } catch (err) {
    console.error('startTask err', err);
    res.status(500).json({ error: 'failed' });
  }
}

/** Verify completion (basic time-based verification) */
async function verifyTask(req, res) {
  try {
    const { participationId, verificationToken } = req.body;
    const minSeconds = Number(req.body.minSeconds || 5); // client may request min time
    if (!participationId) return res.status(400).json({ error: 'missing' });

    const signer = require('../utils/signedLink');

    const p = await TaskParticipation.findById(participationId);
    if (!p) return res.status(404).json({ error: 'not found' });
    if (p.status !== 'started') return res.status(400).json({ error: 'invalid status' });

    // If verificationToken provided, verify signature and participation id/expiry
    if (verificationToken) {
      const payload = signer.verifyToken(verificationToken);
      if (!payload || String(payload.participationId) !== String(participationId) || payload.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'invalid verification token' });
      }
    } else {
      const elapsed = (Date.now() - new Date(p.startedAt).getTime()) / 1000;
      if (elapsed < minSeconds) return res.status(400).json({ error: 'not enough time spent' });
    }

    // mark verified and reward
    const campaign = await TaskCampaign.findById(p.taskId);
    if (!campaign || campaign.status !== 'active' || (campaign.remaining || 0) < campaign.rewardPerAction) return res.status(400).json({ error: 'campaign cannot pay' });

    await runInTransaction(async (session) => {
      // decrease campaign remaining
      campaign.remaining = Number((campaign.remaining - campaign.rewardPerAction).toFixed(4));
      if (campaign.remaining <= 0) campaign.status = 'completed';
      await campaign.save({ session });

      // credit user wallet mallpoints
      const wallet = await Wallet.findOne({ ownerId: p.userId }).session(session);
      if (!wallet) {
        // create wallet
        const nw = new Wallet({ ownerId: p.userId, mallpoints: campaign.rewardPerAction });
        await nw.save({ session });
      } else {
        wallet.mallpoints = Number(((wallet.mallpoints || 0) + campaign.rewardPerAction).toFixed(4));
        await wallet.save({ session });
      }

      const userTx = new WalletTransaction({ ownerId: p.userId, type: 'task_reward', amount: campaign.rewardPerAction, currency: 'MLPTS', meta: { taskId: campaign._id } });
      await userTx.save({ session });

      const pubTx = new WalletTransaction({ ownerId: campaign.publisherId, type: 'task_charge', amount: -campaign.rewardPerAction, currency: 'MLPTS', meta: { taskId: campaign._id, to: p.userId } });
      await pubTx.save({ session });

      p.status = 'rewarded';
      p.verifiedAt = new Date();
      p.rewardedAt = new Date();
      await p.save({ session });

      emitBalanceUpdate(req.app, wallet);
      // also notify publisher if they are online
      const pubWallet = await Wallet.findOne({ ownerId: campaign.publisherId }).session(session);
      if (pubWallet) emitBalanceUpdate(req.app, pubWallet);

      req.app.get("io")?.emit("ledger:update");

      res.json({ ok: true, rewarded: campaign.rewardPerAction });
    });
  } catch (err) {
    console.error('verifyTask err', err);
    res.status(500).json({ error: 'verify failed' });
  }
}

module.exports = {
  createTask,
  listTasks,
  startTask,
  verifyTask
};

// Verify via signed redirect (publisher may redirect worker back with token)
async function verifyRedirect(req, res) {
  try {
    const token = req.query && (req.query.token || req.query.verificationToken);
    if (!token) return res.status(400).json({ error: 'missing token' });
    const signer = require('../utils/signedLink');
    const payload = signer.verifyToken(token);
    if (!payload || !payload.participationId || payload.expiresAt < Date.now()) return res.status(400).json({ error: 'invalid token' });

    const participationId = payload.participationId;
    const p = await TaskParticipation.findById(participationId);
    if (!p) return res.status(404).json({ error: 'not found' });
    if (p.status !== 'started') return res.status(400).json({ error: 'invalid status' });

    const campaign = await TaskCampaign.findById(p.taskId);
    if (!campaign || campaign.status !== 'active' || (campaign.remaining || 0) < campaign.rewardPerAction) return res.status(400).json({ error: 'campaign cannot pay' });

    await runInTransaction(async (session) => {
      campaign.remaining = Number((campaign.remaining - campaign.rewardPerAction).toFixed(4));
      if (campaign.remaining <= 0) campaign.status = 'completed';
      await campaign.save({ session });

      const wallet = await Wallet.findOne({ ownerId: p.userId }).session(session);
      if (!wallet) {
        const nw = new Wallet({ ownerId: p.userId, mallpoints: campaign.rewardPerAction });
        await nw.save({ session });
      } else {
        wallet.mallpoints = Number(((wallet.mallpoints || 0) + campaign.rewardPerAction).toFixed(4));
        await wallet.save({ session });
      }

      const userTx = new WalletTransaction({ ownerId: p.userId, type: 'task_reward', amount: campaign.rewardPerAction, currency: 'MLPTS', meta: { taskId: campaign._id } });
      await userTx.save({ session });

      const pubTx = new WalletTransaction({ ownerId: campaign.publisherId, type: 'task_charge', amount: -campaign.rewardPerAction, currency: 'MLPTS', meta: { taskId: campaign._id, to: p.userId } });
      await pubTx.save({ session });

      p.status = 'rewarded';
      p.verifiedAt = new Date();
      p.rewardedAt = new Date();
      await p.save({ session });

      // redirect to a success page on frontend if provided
      const redirectUrl = req.query.redirect || '/earn?result=ok';
      return res.redirect(302, redirectUrl);
    });
  } catch (err) {
    console.error('verifyRedirect err', err);
    res.status(500).json({ error: 'verify failed' });
  }
}

module.exports.verifyRedirect = verifyRedirect;
