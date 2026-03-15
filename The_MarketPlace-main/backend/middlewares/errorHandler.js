function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal server error',
      details: err.details || null,
      requestId: req.requestId
    }
  });
}

module.exports = errorHandler;
