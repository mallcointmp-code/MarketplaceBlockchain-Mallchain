// Converted to CommonJS
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const IORedis = require('ioredis');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

dotenv.config();

// In CommonJS, __dirname is available

const connectDB = require('./config/db.js');
let requestContext = require('./middlewares/requestContext.js'); requestContext = requestContext && (requestContext.default || requestContext);
let errorHandler = require('./middlewares/errorHandler.js'); errorHandler = errorHandler && (errorHandler.default || errorHandler);
let requestId = require('./middlewares/requestId.js'); requestId = requestId && (requestId.default || requestId);
const User = require('./models/User.js');
const Job = require('./models/JobListing.js');
const DeliveryAgent = require('./models/DeliveryAgent.js');
const monitoring = require('./utils/monitoring.js');

const requireCJS = require;

connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marketplace');

// Ensure uploads directory exists for multer disk storage
try {
  fs.mkdirSync(path.join(process.cwd(), 'uploads', 'products'), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), 'uploads', 'avatars'), { recursive: true });
} catch (e) { /* ignore */ }

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const REDIS_URL = process.env.REDIS_URL || null;
let redis = null;
let useRedis = false;
try {
  if (REDIS_URL) {
    redis = new IORedis(REDIS_URL);
    useRedis = true;
    console.log('[redis] connecting to', REDIS_URL);
    // attach handlers to avoid unhandled error events and to gracefully fallback
    redis.on('error', (err) => {
      console.warn('[redis] connection error:', err && err.message);
      useRedis = false;
    });
    redis.on('connect', () => console.log('[redis] connect event'));
    redis.on('ready', () => {
      console.log('[redis] ready');
      useRedis = true;
    });
  }
} catch (e) {
  console.warn('[redis] not available, falling back to in-memory counters', e && e.message);
}

// expose redis client on app for utilities that need it (antiFraud, jobs)
if (redis) {
  try { app.set('redis', redis); global.__redisClient__ = redis; } catch (e) { /* ignore */ }
}

// In-memory fallback socket counts
const userSocketCounts = new Map();
const agentSocketCounts = new Map();
const userKey = (id) => `sockets:user:${id}`;
const agentKey = (id) => `sockets:agent:${id}`;
const SOCKET_KEY_TTL = 60 * 60 * 24; // 24h

io.use((socket, next) => {
  try {
    const token = (socket.handshake.auth && socket.handshake.auth.token) || (socket.handshake.query && socket.handshake.query.token);
    if (!token) return next(new Error('Authentication error: token required'));
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      return next();
    });
  } catch (e) {
    console.error('socket auth error', e);
    return next(new Error('Authentication error'));
  }
});

app.set('io', io);

io.on('connection', async (socket) => {
  console.log('socket connected:', socket.id, 'user:', socket.user && socket.user._id);
  const user = socket.user;
  if (!user) return socket.disconnect(true);
  const uid = String(user._id);
  try {
    if (useRedis && redis) {
      const ucount = await redis.incr(userKey(uid));
      await redis.expire(userKey(uid), SOCKET_KEY_TTL);
      socket.join(`user:${uid}`);
    } else {
      userSocketCounts.set(uid, (userSocketCounts.get(uid) || 0) + 1);
      socket.join(`user:${uid}`);
    }

    if (user.role === 'admin') socket.join('admin:delivery');

    if (user.agentId) {
      const aid = String(user.agentId);
      if (useRedis && redis) {
        const aCount = await redis.incr(agentKey(aid));
        await redis.expire(agentKey(aid), SOCKET_KEY_TTL);
        socket.join(`agent:${aid}`);
        if (Number(aCount) === 1) {
          try {
            await DeliveryAgent.findByIdAndUpdate(aid, { online: true, 'lastLocation.updatedAt': new Date() }, { new: true });
            io.to('admin:delivery').emit('agent:status', { agentId: aid, online: true });
          } catch (err) { console.error('Mark agent online error', err); }
        }
      } else {
        agentSocketCounts.set(aid, (agentSocketCounts.get(aid) || 0) + 1);
        socket.join(`agent:${aid}`);
        if (agentSocketCounts.get(aid) === 1) {
          try {
            await DeliveryAgent.findByIdAndUpdate(aid, { online: true, 'lastLocation.updatedAt': new Date() }, { new: true });
            io.to('admin:delivery').emit('agent:status', { agentId: aid, online: true });
          } catch (err) { console.error('Mark agent online error', err); }
        }
      }
    }
  } catch (err) {
    console.error('socket connect counter error', err);
  }

  socket.on('subscribeTask', ({ taskId }) => { if (taskId) socket.join(`task:${taskId}`); });

  socket.on('disconnect', async () => {
    try {
      const uid = String(user._id);
      if (useRedis && redis) {
        const newU = await redis.decr(userKey(uid));
        if (newU <= 0) await redis.del(userKey(uid));
      } else {
        const prev = userSocketCounts.get(uid) || 1;
        const nextCount = Math.max(0, prev - 1);
        if (nextCount === 0) userSocketCounts.delete(uid);
        else userSocketCounts.set(uid, nextCount);
      }

      if (user.agentId) {
        const aid = String(user.agentId);
        if (useRedis && redis) {
          const newA = await redis.decr(agentKey(aid));
          if (newA <= 0) {
            await redis.del(agentKey(aid));
            try {
              await DeliveryAgent.findByIdAndUpdate(aid, { online: false }, { new: true });
              io.to('admin:delivery').emit('agent:status', { agentId: aid, online: false });
            } catch (err) { console.error('Mark agent offline error', err); }
          } else {
            await redis.expire(agentKey(aid), SOCKET_KEY_TTL);
          }
        } else {
          const aPrev = agentSocketCounts.get(aid) || 1;
          const aNext = Math.max(0, aPrev - 1);
          if (aNext === 0) {
            agentSocketCounts.delete(aid);
            try {
              await DeliveryAgent.findByIdAndUpdate(aid, { online: false }, { new: true });
              io.to('admin:delivery').emit('agent:status', { agentId: aid, online: false });
            } catch (err) { console.error('Mark agent offline error', err); }
          } else {
            agentSocketCounts.set(aid, aNext);
          }
        }
      }
    } catch (err) {
      console.error('Socket disconnect handling failed', err);
    }
  });
});

// Security & parsing
app.use(helmet());
app.use(monitoring.metricsMiddleware);
// Flexible CORS for local development: allow localhost origins and any origins
// listed in env var ALLOWED_ORIGINS (comma separated). In production, set
// ALLOWED_ORIGINS to restrict origins.
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow non-browser requests like curl, same-origin
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      // Allow all localhost variants (any port)
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) return cb(null, true);
    } catch (e) {
      // ignore parse errors
    }
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.includes(origin)) return cb(null, true);
    // Fallback: allow if explicit env var ALLOW_ALL_ORIGINS=true (dev only)
    if (String(process.env.ALLOW_ALL_ORIGINS).toLowerCase() === 'true') return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, url, body, query } = req;

  // Sanitize body for logs
  const safeBody = { ...body };
  if (safeBody.password) safeBody.password = '***';
  if (safeBody.pin) safeBody.pin = '****';

  console.log(`[REQ] ${method} ${url}`, { query, body: safeBody });

  // Hook into response finish to log status
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[RES] ${method} ${url} ${res.statusCode} (${duration}ms)`);
  });

  next();
});

app.use(requestContext);
app.use(requestId);

const isDev = process.env.NODE_ENV === 'development';

// Rate limiting (disabled in development for unrestricted testing)
if (!isDev) {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } }
  });
  if (typeof authLimiter === 'function') app.use('/api/auth', authLimiter);
  else console.warn('[init] authLimiter not a function');

  const walletLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many wallet actions' } }
  });
  if (typeof walletLimiter === 'function') app.use('/api/wallet', walletLimiter);
  else console.warn('[init] walletLimiter not a function');

  // limiter middleware (CommonJS require)
  let limiter;
  try { limiter = require('./middlewares/limitMiddleware.js'); limiter = limiter && (limiter.default || limiter); } catch (e) { limiter = null; }
  if (limiter && typeof limiter === 'function') app.use('/api/', limiter);
  else if (limiter) console.warn('[init] limiter loaded but is not a function');
} else {
  console.log('[init] Rate limiting DISABLED in development mode for unrestricted testing');
}

// Route mounting using dynamic require/import so both CommonJS and ESM routers work.
// Use a cache to avoid loading the same module multiple times (prevents duplicate declarations)
const moduleCache = new Map();

async function safeMount(routePath, modulePath) {
  try {
    let mod;
    // resolve absolute path for local modules
    let absPath = null;
    try { absPath = path.resolve(__dirname, modulePath); } catch (pe) { absPath = null; }

    // If we've already loaded this path, reuse the cached module
    if (absPath && moduleCache.has(absPath)) {
      mod = moduleCache.get(absPath);
    } else if (!absPath) {
      if (moduleCache.has(modulePath)) mod = moduleCache.get(modulePath);
    }

    if (!mod) {
      if (absPath && fs.existsSync(absPath)) {
        const src = fs.readFileSync(absPath, 'utf8');
        const ext = path.extname(absPath).toLowerCase();
        const looksLikeESM = ext === '.mjs' || /\b(import|export)\b/.test(src);
        const absUrl = pathToFileURL(absPath).href;
        if (looksLikeESM) {
          const imported = await import(absUrl);
          mod = imported && (imported.default || imported);
        } else {
          try { mod = require(absPath); } catch (rerr) {
            const imported = await import(absUrl);
            mod = imported && (imported.default || imported);
          }
        }
        try { if (mod) moduleCache.set(absPath, mod); } catch (e) { }
      } else {
        // try require first, fallback to dynamic import
        try {
          if (moduleCache.has(modulePath)) mod = moduleCache.get(modulePath);
          else mod = require(modulePath);
        } catch (ie) {
          const imported = await import(modulePath);
          mod = imported && (imported.default || imported);
          try { if (mod) moduleCache.set(modulePath, mod); } catch (e) { }
        }
      }
    }

    // Try to unwrap common module shapes so routers exportable as
    // default, named `router`, or nested `default` are accepted.
    let router = mod && (mod.default || mod);
    // If router is an object that contains a router under common keys, prefer that
    if (router && typeof router === 'object') {
      if (router.router) router = router.router;
      else if (router.default && (typeof router.default === 'function' || router.default.handle)) router = router.default;
      else if (router.routes && typeof router.routes === 'function') router = router.routes;
    }
    // If router is still a module object with named exports, try to find an export that's a router
    if (router && typeof router === 'object' && !router.handle) {
      for (const k of Object.keys(router)) {
        if (router[k] && typeof router[k] === 'object' && router[k].handle) {
          router = router[k];
          break;
        }
      }
    }

    console.log('[mount] %s -> %s (type=%s)', routePath, modulePath, typeof router);
    if (router && (typeof router === 'function' || (router && router.handle))) app.use(routePath, router);
    else console.warn('[mount] %s -> %s : no router exported (exports: %s)', routePath, modulePath, mod && typeof mod === 'object' ? Object.keys(mod).join(',') : typeof mod);
  } catch (e) {
    console.error('[mount][error] %s -> %s :', routePath, modulePath, e && e.message);
  }
}

const mounts = [
  ['/api/auth', './routes/auth.js'],
  ['/api/users', './routes/users.js'],
  ['/api/stats', './routes/stats.js'],
  ['/api/wallet', './routes/wallet.js'],
  ['/api/tasks', './routes/tasks.js'],
  ['/api/qr', './routes/qr.js'],
  ['/api/badges', './routes/badge.js'],
  ['/api/jobs', './routes/jobs.js'],
  ['/api/employer-jobs', './routes/employerJobs.js'],
  ['/api/adminJobs', './routes/adminJobs.js'],
  ['/api/reviews', './routes/reviews.js'],
  ['/api/analytics', './routes/analytics.js'],
  ['/api/delivery', './routes/delivery.js'],
  ['/api/agent', './routes/agent.js'],
  ['/api/web3', './routes/web3.js'],
  ['/api/investments', './routes/bugbounty.js'],
  ['/api/fraud', './routes/fraud.js'],
  ['/api/disputes', './routes/disputes.js'],
  ['/api/notification', './routes/notification.js'],
  ['/api/posts', './routes/posts.js'],
  ['/api/referral', './routes/referral.js'],
  // ['/api/seller', './routes/seller.js'], // Handled by explicit ES import attempt above
  ['/api/shops', './routes/shops.js'],
  ['/api/session', './routes/session.js'],
  // tasks duplicate removed
  ['/api/tasksAdmin', './routes/tasksAdmin.js'],
  ['/api/tasksCreator', './routes/tasksCreator.js'],
  ['/api/admin', './routes/admin.js'],
  ['/api/admin/redis', './routes/redisStats.js'],
  ['/api/admin/migration-results', './routes/migrationResults.js'],
  ['/api/admin/migration', './routes/migration.js'],
  ['/api/admin/audit', './routes/adminAudit.js'],
  ['/api/admin/tasks', './routes/adminTasksConfig.js'],
  ['/api/admin/reports', './routes/adminReports.js'],
  ['/api/receipt', './routes/receipt.js'],
  ['/api/chat', './routes/chat.js'],
  ['/api/wishlist', './routes/wishlist.js'],
  ['/api/blockchain', './routes/blockchain.js']
];


async function init() {
  // First, explicitly attempt to import a few known ESM-style route modules
  // directly via dynamic import to avoid CommonJS/require() pitfalls.
  try {
    const sellerMod = await import(pathToFileURL(path.resolve(__dirname, './routes/seller.js')).href);
    const sellerRouter = sellerMod && (sellerMod.default || sellerMod);
    if (sellerRouter && (typeof sellerRouter === 'function' || sellerRouter.handle)) {
      app.use('/api/seller', sellerRouter);
      console.log('[mount] /api/seller -> ./routes/seller.js (esm-import)');
    }
  } catch (e) {
    console.error('[mount][error] /api/seller direct import:', e && e.message);
  }

  // mount them sequentially (concurrently)
  await Promise.all(mounts.map(m => safeMount(m[0], m[1])));

  // Additional mounts
  await safeMount('/api/taskUser', './routes/taskUser.js');
  await safeMount('/api/metrics', './routes/metrics.js');
  await safeMount('/api/profile', './routes/profile.js');
  await safeMount('/api/uploads', './routes/uploads.js');
  await safeMount('/api/analytics', './routes/analytics.js');
  await safeMount('/api/orthopharm/admin', './routes/orthopharmAdmin.js');
  await safeMount('/api/orthopharm/employee', './routes/orthopharmEmployee.js');
  await safeMount('/api/supermarket/worker', './routes/supermarketWorker.js');
  await safeMount('/api/orthopharm/review', './routes/orthopharmReview.js');
  await safeMount('/api/orthopharm/notification', './routes/orthopharmNotification.js');
  await safeMount('/api/orthopharm/appointment', './routes/orthopharmAppointment.js');
  await safeMount('/api/supermarket/admin', './routes/supermarketAdmin.js');

  // Receipts, Ads, Advertisements and products/cart/checkout
  await safeMount('/api/receipts', './routes/receipts.js');
  await safeMount('/api/ads', './routes/ads.js');
  await safeMount('/api/ads/track', './routes/adTracking.js');
  try { await safeMount('/api/ads/v2', './routes/advertisements.js'); console.log('[mount] /api/ads/v2'); } catch (e) { }
  await safeMount('/api/products', './routes/products.js');
  await safeMount('/api/demo', './routes/demoFunds.js');
  await safeMount('/api/cart', './routes/cart.js');
  await safeMount('/api/checkout', './routes/checkout.js');
  await safeMount('/api/mpesa', './routes/mpesa.js');
  await safeMount('/api/order', './routes/order.js');
  // OAuth popup endpoints (frontend opens /auth/:provider)
  await safeMount('/auth', './routes/oauth.js');

  // Initialize ethService early so on-chain ops don't need to re-init per-request
  // try {
  //   const ethSvc = require('./services/ethService.js');
  //   if (ethSvc && typeof ethSvc.init === 'function') {
  //     ethSvc.init().then(() => console.log('[ethService] initialized at startup')).catch(e => console.warn('[ethService] init failed', e && e.message));
  //   }
  // } catch (e) {
  //   console.warn('[ethService] init skipped:', e && e.message);
  // }

  // serve uploads statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Metrics: Full System-wide Prometheus Integration
  app.get('/metrics', async (req, res) => {
    try {
      // Update gauges for growth summaries
      monitoring.activeUsers.set(await User.countDocuments());

      res.set('Content-Type', monitoring.register.contentType);
      res.end(await monitoring.register.metrics());
    } catch (e) {
      console.error('Metrics collection failed', e);
      res.status(500).send('Metrics collection failed');
    }
  });

  // Task Creator history endpoint fallback
  app.get('/api/tasksCreator/history', (req, res) => {
    const { authMiddleware } = require('./middlewares/authMiddleware.js');
    authMiddleware(req, res, async () => {
      try {
        const Task = require('./models/Task.js');
        const tasks = await Task.find({ creator: req.user._id })
          .sort({ createdAt: -1 })
          .limit(50);
        
        const history = tasks.map(task => ({
          id: task._id,
          title: task.title,
          status: task.status,
          reward: task.reward,
          budget: task.budget,
          createdAt: task.createdAt,
          completedAt: task.completedAt
        }));

        res.json({ success: true, data: history });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
      }
    });
  });

  // 404 handler
  // Temporary fallback endpoints for dashboards: return minimal, well-shaped payloads
  // This helps the frontend render while some route mounting issues are being resolved.
  app.get('/api/seller/dashboard/v2', (req, res) => {
    res.json({
      stats: {
        totalSales: 0,
        totalSalesChange: 0,
        totalOrders: 0,
        totalOrdersChange: 0,
        visitors: 0,
        visitorsChange: 0,
        totalSoldProducts: 0,
        totalSoldProductsChange: 0,
        productSalesToday: 0,
        productSalesTodayChange: 0,
        categoryStats: [],
        customerHabitsSummary: { periodDays: 14, totalOrders: 0 },
        customerHabitsSeries: [],
        customerGrowthByRegion: []
      },
      shops: [],
      products: [],
      recentOrders: []
    });
  });

  app.get('/api/seller/dashboard', (req, res) => {
    res.json({ shops: [], products: [], orders: [], totalSales: 0 });
  });

  // Lightweight fallback product listing removed as it conflicts with real routes.


  // Minimal checkout fallback so frontend can simulate a successful payment flow.
  app.post('/api/checkout', express.json(), (req, res) => {
    try {
      const { items, total } = req.body || {};
      const tx = {
        id: `tx_${Date.now()}`,
        amount: total || (Array.isArray(items) ? items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0) : 0),
        currency: 'KES',
        date: new Date().toISOString(),
        items: items || []
      };
      return res.json({ transaction: tx });
    } catch (e) { return res.status(500).json({ error: 'checkout failed' }); }
  });

  // In-memory mock stores for shops, seller products and orders to enable frontend development
  if (!app.locals.__mock_store__) {
    app.locals.__mock_store__ = {
      shops: [],
      sellerProducts: [],
      sellerOrders: []
    };
  }
  const mock = app.locals.__mock_store__;
  const multer = require('multer');
  const upload = multer({ storage: multer.memoryStorage() });

  // Create shop (multipart/form-data or JSON)
  app.post('/api/shops', upload.array('images'), (req, res) => {
    try {
      const body = req.body || {};
      const id = `shop_${Date.now()}`;
      const images = (req.files || []).map((f, i) => ({ filename: f.originalname || `img${i}`, size: f.size }));
      const shop = { _id: id, name: body.name || body.shopName || 'Untitled Shop', location: body.location || '', images, createdAt: new Date().toISOString(), rentPaid: false };
      mock.shops.push(shop);
      return res.json({ shop });
    } catch (e) { return res.status(500).json({ error: 'create shop failed' }); }
  });

  // List shops
  app.get('/api/shops', (req, res) => {
    return res.json({ shops: mock.shops });
  });

  // Rent shop (simulate MallMoney payment)
  app.post('/api/shops/:id/rent', express.json(), (req, res) => {
    try {
      const id = req.params.id;
      const shop = mock.shops.find(s => s._id === id);
      if (!shop) return res.status(404).json({ error: 'shop not found' });
      shop.rentPaid = true;
      shop.lastRent = { paidAt: new Date().toISOString(), amount: req.body.amount || 0, method: 'MallMoney', tx: `rent_${Date.now()}` };
      return res.json({ success: true, payment: shop.lastRent, shop });
    } catch (e) { return res.status(500).json({ error: 'rent failed' }); }
  });

  // Placeholder seller handlers removed.


  // Seller orders (simple mock list)
  if (!mock.sellerOrders.length) {
    mock.sellerOrders.push({ _id: 'ord_1', status: 'Awaiting Delivery', items: [{ name: 'Sample Product', qty: 1 }], total: 1200, createdAt: new Date().toISOString() });
    mock.sellerOrders.push({ _id: 'ord_2', status: 'Processing', items: [{ name: 'Another Item', qty: 2 }], total: 2400, createdAt: new Date().toISOString() });
  }

  app.get('/api/seller/orders', (req, res) => {
    return res.json({ orders: mock.sellerOrders });
  });

  app.post('/api/seller/orders/:id/approve', express.json(), (req, res) => {
    try {
      const id = req.params.id;
      const o = mock.sellerOrders.find(x => x._id === id || x.id === id);
      if (!o) return res.status(404).json({ error: 'order not found' });
      o.status = 'Approved';
      o.approvedAt = new Date().toISOString();
      return res.json({ success: true, order: o });
    } catch (e) { return res.status(500).json({ error: 'approve failed' }); }
  });

  app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found', path: req.originalUrl } });
  });

  // Central error handler
  app.use(errorHandler);

  // start server with port auto-increment
  let PORT = Number(process.env.PORT || 3000); // 3000 default if env missing, but user wants 5000 usually
  if (process.env.PORT) PORT = Number(process.env.PORT);
  // Fallback to 5000 if 3000 (standard for this app seems to be 5000 based on user context)
  if (PORT === 3000) PORT = 5000;

  function startServer(port) {
    server.listen(port, () => {
      console.log(`Server with Socket.IO running on ${port}`);
      // mount swagger after server starts
      try {
        const swagger = require('./swagger.js');
        const sw = swagger && (swagger.default || swagger);
        if (sw) { sw(app); console.log('[swagger] mounted at /api-docs'); }
      } catch (e) { console.log('[swagger] skipped:', e && e.message); }
      // start conversion scheduler (tasks economy)
      try {
        const convJob = require('./jobs/conversionJob');
        if (convJob && convJob.start) convJob.start(app);
        console.log('[jobs] conversionJob started');
      } catch (e) { console.warn('[jobs] conversionJob failed to start', e && e.message); }
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is in use, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Server failed to start:', err);
      }
    });
  }

  startServer(PORT);

  // Keep process alive and handle errors
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit on unhandled rejection
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Don't exit - just log it
  });

  console.log('✅ Server initialization complete');
}

init().catch(err => { console.error('Initialization failed', err); });

module.exports = app;
