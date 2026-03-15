// CommonJS shim for ESM roleMiddleware.js
// Exposes a middleware factory compatible with require()

module.exports = function(roles) {
  return function(req, res, next) {
    (async () => {
      try {
        const mod = await import('./roleMiddleware.js');
        const factory = mod && (mod.default || mod.requireRole || mod.require2FA || mod.requireRole);
        // try common named export
        const requireRole = (mod && (mod.requireRole || mod.default || mod.requireRole)) || factory;
        if (typeof requireRole !== 'function') return next(new Error('role middleware factory not available'));
        const mw = requireRole(roles);
        return mw(req, res, next);
      } catch (err) {
        next(err);
      }
    })();
  };
};

module.exports.default = module.exports;
