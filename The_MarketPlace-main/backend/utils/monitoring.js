const prom = require('prom-client');

// Initialize default metrics (CPU, memory, etc.)
prom.collectDefaultMetrics();

// Define custom metrics for "System Police"
const httpRequestDuration = new prom.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const loginAttempts = new prom.Counter({
    name: 'auth_login_attempts_total',
    help: 'Total number of login attempts for security monitoring',
    labelNames: ['status'] // success, failure
});

const ordersCreated = new prom.Counter({
    name: 'orders_total',
    help: 'Total number of orders created for growth tracking'
});

const productsCreated = new prom.Counter({
    name: 'products_total',
    help: 'Total number of products added for growth tracking'
});

const activeUsers = new prom.Gauge({
    name: 'active_users',
    help: 'Number of currently active sessions'
});

/**
 * Middleware to track HTTP request duration
 */
const metricsMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    });
    next();
};

module.exports = {
    register: prom.register,
    metricsMiddleware,
    loginAttempts,
    ordersCreated,
    productsCreated,
    activeUsers
};
