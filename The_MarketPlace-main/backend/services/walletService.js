const Wallet = require('../models/Wallet.js');
const WalletTransaction = require('../models/WalletTransaction.js');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { runInTransaction } = require('../utils/transactionHelper.js');

async function getOrCreateWallet(userId) {
  let w = await Wallet.findOne({ ownerId: userId });
  if (!w) {
    w = new Wallet({ ownerId: userId, mallmoney: 0, reservedEscrow: 0 });
    await w.save();
  }
  return w;
}

async function deposit(userId, amount, meta = {}) {
  try {
    return await runInTransaction(async (session) => {
      const w = await Wallet.findOne({ ownerId: userId }).session(session);
      if (!w) throw new Error("Wallet not found");
      const before = w.mallmoney;
      w.mallmoney = (w.mallmoney || 0) + amount;
      w.updatedAt = new Date();
      await w.save({ session });

      const tx = new WalletTransaction({
        walletId: w._id,
        userId,
        type: "deposit",
        amount,
        balanceBefore: before,
        balanceAfter: w.mallmoney,
        meta
      });
      await tx.save({ session });
      return { ok: true, wallet: w, tx };
    });
  } catch (err) {
    throw err;
  }
}

async function withdraw(userId, amount, meta = {}) {
  try {
    return await runInTransaction(async (session) => {
      const w = await Wallet.findOne({ ownerId: userId }).session(session);
      if (!w) throw new Error("Wallet not found");
      if ((w.mallmoney || 0) < amount) throw new Error("Insufficient funds");
      const before = w.mallmoney;
      w.mallmoney = (w.mallmoney || 0) - amount;
      w.updatedAt = new Date();
      await w.save({ session });

      const tx = new WalletTransaction({
        walletId: w._id,
        userId,
        type: "withdraw",
        amount,
        balanceBefore: before,
        balanceAfter: w.mallmoney,
        meta
      });
      await tx.save({ session });
      return { ok: true, wallet: w, tx };
    });
  } catch (err) {
    throw err;
  }
}

async function send(userId, toUserId, amount, meta = {}) {
  try {
    return await runInTransaction(async (session) => {
      const sender = await Wallet.findOne({ ownerId: userId }).session(session);
      const receiver = await Wallet.findOne({ ownerId: toUserId }).session(session);
      if (!sender) throw new Error("Sender wallet not found");
      if (!receiver) throw new Error("Receiver wallet not found");
      if ((sender.mallmoney || 0) < amount) throw new Error("Insufficient funds");
      const sBefore = sender.mallmoney;
      const rBefore = receiver.mallmoney;

      sender.mallmoney -= amount;
      receiver.mallmoney += amount;
      sender.updatedAt = receiver.updatedAt = new Date();

      await sender.save({ session });
      await receiver.save({ session });

      const txOut = new WalletTransaction({
        walletId: sender._id,
        userId,
        type: "send",
        amount,
        balanceBefore: sBefore,
        balanceAfter: sender.mallmoney,
        meta: { ...meta, toUserId }
      });
      const txIn = new WalletTransaction({
        walletId: receiver._id,
        userId: toUserId,
        type: "receive",
        amount,
        balanceBefore: rBefore,
        balanceAfter: receiver.mallmoney,
        meta: { ...meta, fromUserId: userId }
      });
      await txOut.save({ session });
      await txIn.save({ session });

      return { ok: true, sender, receiver, txOut, txIn };
    });
  } catch (err) {
    throw err;
  }
}

async function reserveEscrow(userId, amount, meta = {}) {
  try {
    return await runInTransaction(async (session) => {
      const w = await Wallet.findOne({ ownerId: userId }).session(session);
      if (!w) throw new Error("Wallet not found");
      if ((w.mallmoney || 0) < amount) throw new Error("Insufficient funds");
      const before = w.mallmoney;
      w.mallmoney -= amount;
      w.reservedEscrow = (w.reservedEscrow || 0) + amount;
      w.updatedAt = new Date();
      await w.save({ session });

      const tx = new WalletTransaction({
        walletId: w._id,
        userId,
        type: "reserve",
        amount,
        balanceBefore: before,
        balanceAfter: w.mallmoney,
        meta
      });
      await tx.save({ session });

      return { ok: true, w, tx };
    });
  } catch (err) {
    throw err;
  }
}

async function releaseEscrow(userId, amount, reason = "release", meta = {}) {
  try {
    return await runInTransaction(async (session) => {
      const w = await Wallet.findOne({ ownerId: userId }).session(session);
      if (!w) throw new Error("Wallet not found");

      const beforeReserved = w.reservedEscrow || 0;
      const before = w.mallmoney;

      w.reservedEscrow = Math.max(0, (w.reservedEscrow || 0) - amount);
      if (meta?.refund) {
        w.mallmoney += amount;
      }
      w.updatedAt = new Date();
      await w.save({ session });

      const tx = new WalletTransaction({
        walletId: w._id,
        userId,
        type: meta?.refund ? "refund" : "release",
        amount,
        balanceBefore: before,
        balanceAfter: w.mallmoney,
        meta: { ...meta, beforeReserved }
      });
      await tx.save({ session });
      return { ok: true, w, tx };
    });
  } catch (err) {
    throw err;
  }
}

function hashPin(pin) {
  return crypto.createHash("sha256").update(String(pin)).digest("hex");
}

module.exports = {
  getOrCreateWallet,
  deposit,
  withdraw,
  send,
  reserveEscrow,
  releaseEscrow,
  hashPin
};