require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const vaultRoutes = require('./routes/vault');
const txRoutes = require('./routes/tx');
const marketRoutes = require('./routes/market');
const walletConnectionRoutes = require('./routes/walletConnection');

const app = express();
const PORT = process.env.PORT || 4000;

const allowedFrontends = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
];

app.use(cors({ origin: allowedFrontends, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Passport for OAuth (Google)
app.use(session({ secret: process.env.SESSION_SECRET || 'dev-secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
require('./utils/passport');

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/tx', txRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/wallet', walletConnectionRoutes);

app.get('/api/protected', require('./middleware/auth'), (req, res) => {
  res.json({ msg: 'protected', user: req.user });
});

async function start() {
  const mongo = process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace';
  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Mongo connected');
  
  // Create HTTP server for socket.io
  const server = http.createServer(app);
  
  // Set up socket.io with CORS
  const io = new Server(server, {
    cors: {
      origin: allowedFrontends,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  // Handle socket.io connections
  io.on('connection', (socket) => {
    console.log('[Socket] User connected:', socket.id);
    
    // Handle authentication
    socket.on('identity', (token) => {
      console.log('[Socket] User authenticated:', socket.id);
    });
    
    // Handle subscriptions
    socket.on('subscribeTask', (data) => {
      console.log('[Socket] Task subscription:', data);
    });
    
    socket.on('disconnect', () => {
      console.log('[Socket] User disconnected:', socket.id);
    });
  });
  
  server.listen(PORT, () => console.log('Server listening on', PORT));
}

start().catch(err => { console.error(err); process.exit(1); });
