// CommonJS shim for ESM authMiddleware.js
// This file forwards calls to the ESM implementation so older require() calls keep working.

module.exports = function(req, res, next) {
  (async () => {
    try {
      const mod = await import('./authMiddleware.js');
      const fn = (mod && (mod.default || mod.authMiddleware)) || mod;
      if (typeof fn !== 'function') return next(new Error('auth middleware not a function'));
      return fn(req, res, next);
    } catch (err) {
      next(err);
    }
  })();
};

module.exports.optional = function(req, res, next) {
  (async () => {
    try {
      const mod = await import('./authMiddleware.js');
      const fn = mod && (mod.optionalAuth || mod.auth.optional || mod.optional);
      if (!fn) return next();
      return fn(req, res, next);
    } catch (err) {
      next(err);
    }
  })();
};

module.exports.protect = module.exports;
