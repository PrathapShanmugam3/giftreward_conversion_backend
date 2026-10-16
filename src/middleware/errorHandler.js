const logger = require('../utils/logger');
const env = require('../config/env');

// 404 handler for unmatched routes.
function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler. Operational errors (ApiError) return their own
// status/message; anything else is logged and returned as a generic 500 so
// internals never leak to clients.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.isOperational ? err.statusCode : 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
  }

  const body = { success: false, message };
  if (err.details) body.details = err.details;
  if (!env.isProd && !err.isOperational) body.stack = err.stack;

  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
