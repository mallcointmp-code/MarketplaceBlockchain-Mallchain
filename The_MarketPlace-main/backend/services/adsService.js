// backend/services/adsService.js
const mongoose = require('mongoose');
const { runInTransaction } = require('../utils/transactionHelper.js');
const AdTransaction = require('../models/AdTransaction.js');
const Wallet = require('../models/Wallet.js');
const WalletTransaction = require('../models/WalletTransaction.js');
const Ad = require('../models/Ad.js');
const AdEvent = require('../models/AdEvent.js');
const redis = require('../config/redis.js');

const DEFAULT_PRICE_IMPRESSION = Number(process.env.PRICE_PER_IMPRESSION || 0.1);
const DEFAULT_PRICE_CLICK = Number(process.env.PRICE_PER_CLICK || 10);

async function reserveEscrow({ sellerId, adId, amount }) {
  try {
    return await runInTransaction(async (session) => {
      const wallet = await Wallet.findOne({ ownerId: sellerId }).session(session);
      if (!wallet || (wallet.mallmoney || 0) < amount) throw new Error("Insufficient funds");
      const before = wallet.mallmoney || 0;
      wallet.mallmoney = before - amount;
      wallet.reservedEscrow = (wallet.reservedEscrow || 0) + amount;
      await wallet.save({ session });

      await AdTransaction.create([{ adId, sellerId, type: "reserve", amount, meta: { note: "ad escrow reserve" } }], { session });
      return { ok: true };
    });
  } catch (err) {
    throw err;
  }
}

async function chargeEscrow({ adId, sellerId, amount, eventMeta = {} }) {
  try {
    return await runInTransaction(async (session) => {
      const wallet = await Wallet.findOne({ ownerId: sellerId }).session(session);
      if (wallet && (wallet.reservedEscrow || 0) >= amount) {
        wallet.reservedEscrow = (wallet.reservedEscrow || 0) - amount;
        await wallet.save({ session });
      }
      const [tx] = await AdTransaction.create([{ adId, sellerId, type: "charge", amount, meta: eventMeta }], { session });
      return tx;
    });
  } catch (err) {
    throw err;
  }
}

async function refundEscrow({ adId, sellerId, amount, reason = "refund" }) {
  try {
    return await runInTransaction(async (session) => {
      const wallet = await Wallet.findOne({ ownerId: sellerId }).session(session);
      if (!wallet) throw new Error("Wallet not found");
      wallet.mallmoney = (wallet.mallmoney || 0) + amount;
      await wallet.save({ session });
      await AdTransaction.create([{ adId, sellerId, type: "refund", amount, meta: { reason } }], { session });
      return { ok: true };
    });
  } catch (err) {
    throw err;
  }
}

async function chargeAdEvent({ adId, userId = null, ip = null, ua = null, type = "impression", eventId = null }) {
  const ad = await Ad.findById(adId);
  if (!ad) throw new Error("Ad not found");

  // price resolution
  let amount = type === "click" ? (ad.unitPrice || DEFAULT_PRICE_CLICK) : (ad.unitPrice ? (ad.unitPrice / 1000) : DEFAULT_PRICE_IMPRESSION);
  if (!amount || amount <= 0) return { charged: false, reason: "no_price" };

  // dedupe key: ad+user or ad+ip per minute
  const key = `ad:dedup:${adId}:${userId || ip}:${Math.floor(Date.now() / 60000)}`;
  try {
    if (redis && redis.set) {
      const set = await redis.set(key, "1", "NX", "EX", 65);
      if (!set) return { charged: false, reason: "duplicate" };
    }
  } catch (e) {
    console.warn("redis dedupe error", e && e.message);
  }

  // ensure reserved escrow
  const wallet = await Wallet.findOne({ ownerId: ad.sellerId || ad.creatorId });
  if (!wallet || (wallet.reservedEscrow || 0) < amount) {
    // insufficient -> pause ad
    ad.status = "paused";
    await ad.save();
    return { charged: false, reason: "insufficient_escrow" };
  }

  // consume escrow and record
  const tx = await chargeEscrow({ adId, sellerId: ad.sellerId || ad.creatorId, amount, eventMeta: { type, userId, ip, ua, eventId } });
  await AdEvent.create({ adId, userId, type, ip, ua, meta: { adTx: tx._id, eventId } }).catch(() => { });
  return { charged: true, amount, adTxId: tx._id };
}

module.exports = { reserveEscrow, chargeEscrow, refundEscrow, chargeAdEvent };