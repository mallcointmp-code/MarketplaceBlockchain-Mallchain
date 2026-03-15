// Minimal env shim for workers that import ../config/env.js
// Keeps behavior safe and reads from process.env.
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  BULL_REDIS: process.env.BULL_REDIS || process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/the_market_place',
  PORT: process.env.PORT || 4000
};

export default env;
