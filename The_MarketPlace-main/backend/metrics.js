const client = require('prom-client');

// Collect default metrics
client.collectDefaultMetrics();

// Custom metrics
const activeUsersGauge = new client.Gauge({
  name: "marketplace_active_users",
  help: "Number of active users"
});

const openJobsGauge = new client.Gauge({
  name: "marketplace_open_jobs",
  help: "Number of open jobs"
});

const apiRequestCounter = new client.Counter({
  name: "marketplace_api_requests_total",
  help: "Total API requests",
  labelNames: ["route", "method", "status"]
});

const badgePurchaseCounter = new client.Counter({
  name: "marketplace_badge_purchases_total",
  help: "Total badge purchases"
});

const walletTransferCounter = new client.Counter({
  name: "marketplace_wallet_transfers_total",
  help: "Total wallet transfers"
});

const refundCounter = new client.Counter({
  name: "marketplace_refunds_total",
  help: "Total refunds"
});

const reviewSubmissionCounter = new client.Counter({
  name: "marketplace_review_submissions_total",
  help: "Total review submissions"
});

const conversionCounter = new client.Counter({
  name: "marketplace_mlpts_conversions_total",
  help: "Total MLPTS conversions"
});

// Example: increment counters in relevant routes
function metricsMiddleware(req, res, next) {
  res.on("finish", () => {
    apiRequestCounter.inc({
      route: req.route ? req.route.path : req.originalUrl,
      method: req.method,
      status: res.statusCode
    });
  });
  next();
}

// CommonJS exports
module.exports = {
  client,
  metricsMiddleware,
  activeUsersGauge,
  openJobsGauge,
  apiRequestCounter,
  badgePurchaseCounter,
  walletTransferCounter,
  refundCounter,
  reviewSubmissionCounter,
  conversionCounter
};
