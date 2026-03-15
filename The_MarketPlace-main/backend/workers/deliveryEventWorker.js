const Bull = require('bull');
const DeliveryTask = require('../models/DeliveryTask.js');
const Wallet = require('../models/Wallet.js');
const WalletTransaction = require('../models/WalletTransaction.js');

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const deliveryWorker = new Bull("delivery-events", REDIS_URL);

deliveryWorker.process(async (job) => {
  const { taskId } = job.data;
  const task = await DeliveryTask.findById(taskId);
  if (!task) throw new Error("task not found");
  return { ok: true };
});

module.exports = deliveryWorker;

module.exports = { Bull, DeliveryTask, Wallet, WalletTransaction, REDIS_URL, deliveryWorker, task };