// Minimal structured logger. Swap for winston/pino later if needed; kept
// dependency-free so Phase 0 doesn't drag in more than necessary.
const env = require('../config/env');

function timestamp() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : 'log'](line, meta);
  } else {
    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : 'log'](line);
  }
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => {
    if (!env.isProd) log('debug', msg, meta);
  },
};
