const Bull = require('bull');

const REDIS_URL = process.env.BULL_REDIS || process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const withdrawQueue = new Bull('withdrawQueue', REDIS_URL, {
  defaultJobOptions: {
    attempts: Number(process.env.WITHDRAW_QUEUE_ATTEMPTS || 5),
    backoff: { type: 'fixed', delay: Number(process.env.WITHDRAW_QUEUE_BACKOFF_MS || 60000) },
    removeOnComplete: true,
    removeOnFail: false
  }
});

module.exports = withdrawQueue;

module.exports = { Bull, REDIS_URL, withdrawQueue };