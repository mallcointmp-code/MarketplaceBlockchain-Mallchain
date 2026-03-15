// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization;
  const token = header && header.split && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId || decoded.id || decoded.sub || decoded.uid || decoded._id;
    if (!id) return res.status(401).json({ error: 'Invalid token payload' });

    const user = await User.findById(id).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });

    user.userId = user._id.toString();
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization;
  const token = header && header.split && header.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId || decoded.id || decoded.sub || decoded.uid;
    if (!id) return next();

    const user = await User.findById(id).select('-password');
    if (user) {
      user.userId = user._id.toString();
      req.user = user;
    }
  } catch (err) {
    // ignore invalid token for optional
  }
  return next();
}

// Export the middleware functions
module.exports = {
  authMiddleware,
  protect: authMiddleware,
  optionalAuth,
};
