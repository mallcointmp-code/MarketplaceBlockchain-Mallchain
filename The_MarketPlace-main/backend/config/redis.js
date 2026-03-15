const IORedis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Configure reconnect strategy and avoid noisy repeated logs
const redis = new IORedis(REDIS_URL, {
	maxRetriesPerRequest: null,
	reconnectOnError: (err) => {
		// reconnect on connection refused or transient network errors
		if (!err) return false;
		const message = (err.message || "").toLowerCase();
		return message.includes("read econnreset") || message.includes("connection") || message.includes("eclicked") || message.includes("connect econnrefused");
	},
	retryStrategy: (times) => {
		// exponential backoff up to 30s
		const delay = Math.min(200 * Math.pow(2, times), 30000);
		return delay;
	}
});

let lastErrLogTs = 0;
redis.on("error", (e) => {
	const now = Date.now();
	// throttle identical errors to at most once every 5s to reduce spam
	if (now - lastErrLogTs > 5000) {
		console.error("[redis] connection error:", e && e.message ? e.message : e);
		lastErrLogTs = now;
	}
});
redis.on("connect", () => console.info("[redis] connecting to", REDIS_URL));
redis.on("ready", () => console.info("[redis] connected"));

// Helper function to check readiness
function isRedisReady() {
	return redis.status === "ready";
}

// CommonJS exports
module.exports = {
	IORedis,
	REDIS_URL,
	redis,
	isRedisReady,
};
