const Queue = require('bull');

const redisConfig = { port: Number(process.env.REDIS_PORT || 6379), host: process.env.REDIS_HOST || '127.0.0.1' };

const adEventsQueue = new Queue('adEvents', { redis: redisConfig });

module.exports = adEventsQueue;

module.exports = { Queue, redisConfig, adEventsQueue };