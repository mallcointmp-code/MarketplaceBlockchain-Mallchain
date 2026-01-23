require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');

const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Passport for OAuth (Google)
app.use(session({ secret: process.env.SESSION_SECRET || 'dev-secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
require('./utils/passport');

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);

app.get('/api/protected', require('./middleware/auth'), (req, res) => {
  res.json({ msg: 'protected', user: req.user });
});

async function start() {
  const mongo = process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace';
  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Mongo connected');
  app.listen(PORT, () => console.log('Server listening on', PORT));
}

start().catch(err => { console.error(err); process.exit(1); });
