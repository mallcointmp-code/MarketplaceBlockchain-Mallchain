const { v4: uuidv4 } = require('uuid');

function requestContext(req, res, next) {
  req.context = {
    requestId: uuidv4(),
    startedAt: Date.now()
  };
  res.setHeader('X-Request-Id', req.context.requestId);
  next();
}

module.exports = requestContext;
