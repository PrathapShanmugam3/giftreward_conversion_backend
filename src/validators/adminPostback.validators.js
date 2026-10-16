const { body, param } = require('express-validator');

const offerIdParamRule = [param('offerId').isInt().withMessage('Invalid offer id')];

const fireBatchRules = [
  body('eventName').trim().notEmpty().withMessage('Event name is required'),
  body('tids').isArray({ min: 1, max: 100 }).withMessage('Provide 1-100 click IDs'),
  body('tids.*').isString().trim().notEmpty().withMessage('Each click ID must be non-empty'),
];

module.exports = { offerIdParamRule, fireBatchRules };
