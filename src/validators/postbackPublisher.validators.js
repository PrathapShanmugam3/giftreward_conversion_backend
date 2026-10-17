const { body, param } = require('express-validator');

const createPostbackRules = [
  body('offerId').isInt().withMessage('offerId is required'),
  body('event').trim().notEmpty().withMessage('Event name is required'),
  body('postbackUrl').trim().notEmpty().withMessage('Postback URL is required'),
];

const idParamRule = [param('id').isInt().withMessage('Invalid postback id')];

const offerPostbackRules = [
  param('id').isInt().withMessage('Invalid offer id'),
  body('event').trim().notEmpty().withMessage('Event name is required'),
  body('postbackUrl').trim().isURL({ require_protocol: true }).withMessage('A valid postback URL is required'),
];

const offerPostbackIdRules = [
  param('id').isInt().withMessage('Invalid offer id'),
  param('postbackId').isInt().withMessage('Invalid postback id'),
];

module.exports = { createPostbackRules, idParamRule, offerPostbackRules, offerPostbackIdRules };
