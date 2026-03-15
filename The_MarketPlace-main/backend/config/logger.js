const { createLogger, transports, format } = require('winston');
import 'winston-daily-rotate-file';
import 'winston-http';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});

module.exports = logger;
module.exports = { logger };