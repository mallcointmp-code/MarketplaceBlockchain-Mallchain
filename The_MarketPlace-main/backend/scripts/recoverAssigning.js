const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const DeliveryTask = require('../models/DeliveryTask');

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/the_market_place';
const OLDEST_MS = Number(process.env.ASSIGNING_RECOVER_MS || 1000 * 60 * 5); // 5 minutes

async function run() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  const cutoff = new Date(Date.now() - OLDEST_MS);
  console.log('Recovering assigning tasks older than', cutoff);
  const res = await DeliveryTask.updateMany({ status: 'assigning', updatedAt: { $lt: cutoff } }, { $set: { status: 'unassigned', updatedAt: new Date() }, $push: { logs: { ts: new Date(), status: 'recovered', note: 'Recovered by startup script' } } });
  console.log('Recovered:', res.nModified || res.modifiedCount || 0);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
