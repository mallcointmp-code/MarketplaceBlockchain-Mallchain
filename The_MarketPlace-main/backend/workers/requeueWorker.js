const mongoose = require('mongoose');
const dotenv = require('dotenv');
const DeliveryTask = require('../models/DeliveryTask.js');
const { assignmentQueue } = require('../queues/deliveryQueue.js');

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/the_market_place';
const STALE_MS = Number(process.env.ASSIGNING_STALE_MS || 30_000); // 30s default
const POLL_MS = Number(process.env.REQUEUE_POLL_MS || 15_000); // run every 15s

async function start() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

  console.log('Requeue worker started. Polling every', POLL_MS, 'ms. Stale threshold:', STALE_MS, 'ms');

  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - STALE_MS);
      const stuck = await DeliveryTask.find({ status: 'assigning', updatedAt: { $lt: cutoff } }).limit(100);

      for (const t of stuck) {
        console.log('Requeuing stale task', t._id.toString());
        await DeliveryTask.findByIdAndUpdate(t._id, { $set: { status: 'unassigned', updatedAt: new Date() }, $push: { logs: { ts: new Date(), status: 'requeued', note: 'Stale assigning reverted by requeue worker' } } });
        await assignmentQueue.add({ taskId: t._id.toString() }, { attempts: 3, backoff: { type: 'fixed', delay: 2000 } });
      }
    } catch (err) {
      console.error('Requeue worker error', err);
    }
  }, POLL_MS);
}

start().catch(err => { console.error(err); process.exit(1); });

module.exports = { mongoose, dotenv, DeliveryTask, MONGO, STALE_MS, POLL_MS };