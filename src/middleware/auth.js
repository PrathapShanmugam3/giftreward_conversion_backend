const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies && req.cookies.accessToken) return req.cookies.accessToken;
  return null;
}

function requireAuth(expectedRole) {
  return (req, res, next) => {
    const token = extractToken(req);
    if (!token) return next(ApiError.unauthorized('Missing access token'));

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      return next(ApiError.unauthorized('Invalid or expired access token'));
    }

    if (expectedRole && payload.role !== expectedRole) {
      return next(ApiError.forbidden('Insufficient role'));
    }

    req.auth = payload; // { sub, role, ... }
    next();
  };
}

module.exports = {
  requirePublisher: requireAuth('publisher'),
  requireAdmin: requireAuth('admin'),
};
