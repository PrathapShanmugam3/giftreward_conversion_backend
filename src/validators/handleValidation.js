const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Drop this after an express-validator chain to turn validation failures into
// a uniform 400 ApiError instead of hand-checking in every controller.
module.exports = function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(ApiError.badRequest('Validation failed', errors.array()));
  }
  next();
};
