const { body, param } = require('express-validator');

const createCampaignRules = [
  body('offerId').isInt().withMessage('offerId is required'),
  body('events').isArray({ min: 1 }).withMessage('At least one event is required'),
  body('events.*.name').trim().notEmpty().withMessage('Event name is required'),
  body('events.*.cashback').isFloat({ min: 0 }).withMessage('Cashback must be a positive number'),
  body('events.*.maxPayout').isFloat({ min: 0 }).withMessage('maxPayout must be a positive number'),
  body('steps').optional().isArray(),
  body('referralEnabled').optional().isBoolean(),
];

const updateCampaignRules = [param('id').isInt(), ...createCampaignRules];

const idParamRule = [param('id').isInt().withMessage('Invalid campaign id')];

const setStatusRules = [
  param('id').isInt().withMessage('Invalid campaign id'),
  body('status').isIn(['active', 'paused']).withMessage('Invalid status value'),
];

module.exports = { createCampaignRules, updateCampaignRules, idParamRule, setStatusRules };
