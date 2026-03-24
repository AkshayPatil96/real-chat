import pino from 'pino';
import path from 'path';
import config from '../config/env.js';

const logDir = path.resolve(process.cwd(), 'logs');

// In TS, we need to be careful about the transport target.
// When running via tsx, it might handle .ts, but pino worker?
// Let's use the file URL or absolute path.
const transportTarget = path.join(import.meta.dirname, 'daily-transport.js');

/**
 * Pino Logger Configuration
 */
const transport = pino.transport({
  targets: [
    {
      level: 'info',
      target: transportTarget,
      options: { folder: logDir, filename: 'app.log' },
    },
    {
      level: 'error',
      target: transportTarget,
      options: { folder: logDir, filename: 'error.log' },
    },
    ...(config.env === 'development'
      ? [
        {
          level: 'debug',
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      ]
      : []),
  ],
});

const logger = pino(
  {
    level: config.env === 'development' ? 'debug' : 'info',
    redact: {
      paths: ['req.headers.authorization', '*.password', '*.token', 'user.email'],
      remove: true,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

export default logger;
