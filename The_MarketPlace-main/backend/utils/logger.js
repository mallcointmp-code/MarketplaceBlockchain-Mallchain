const { createLogger, format, transports } = require('winston');
import 'winston-daily-rotate-file';
import 'winston-http';
const client = require('prom-client');

client.collectDefaultMetrics();

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new transports.DailyRotateFile({ filename: 'logs/app-%DATE%.log', datePattern: 'YYYY-MM-DD', maxFiles: '14d' }),
    new transports.Http({ host: process.env.LOG_HTTP_HOST || 'your-log-server.com', port: Number(process.env.LOG_HTTP_PORT || 8080), path: process.env.LOG_HTTP_PATH || '/api/logs', ssl: false })
  ]
});

module.exports = logger;

export async function metricsHandler(req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}
module.exports = { client, logger };