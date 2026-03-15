// CommonJS shim for uploadMiddleware.js (ESM). Exposes uploadHandler and uploadProductImages

module.exports = {};

module.exports.uploadHandler = function(req, res, next) {
  (async () => {
    try {
      const mod = await import('./uploadMiddleware.js');
      const fn = mod && (mod.uploadHandler || mod.default && mod.default.uploadHandler);
      if (typeof fn !== 'function') return next(new Error('uploadHandler not available'));
      return fn(req, res, next);
    } catch (err) {
      next(err);
    }
  })();
};

module.exports.uploadProductImages = function(req, res, next) {
  (async () => {
    try {
      const mod = await import('./uploadMiddleware.js');
      const fn = mod && (mod.uploadProductImages || (mod.default && mod.default.uploadProductImages));
      if (typeof fn !== 'function') return next(new Error('uploadProductImages not available'));
      return fn(req, res, next);
    } catch (err) {
      next(err);
    }
  })();
};
