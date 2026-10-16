const { body, param, query } = require('express-validator');

const PAYOUT_TYPES = ['CPI', 'CPA', 'CPL', 'CPS', 'CPM', 'CPC', 'CPV', 'CPR', 'CPE', 'CPT', 'CPD', 'RevShare', 'Hybrid'];
const OFFER_STATUSES = ['active', 'paused', 'pending'];

const createOfferRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('link').trim().notEmpty().withMessage('Tracking link is required'),
  body('payoutType').isIn(PAYOUT_TYPES).withMessage('Invalid payout type'),
  body('status').optional().isIn(OFFER_STATUSES).withMessage('Invalid status'),
  body('events').optional().isArray().withMessage('events must be an array'),
  body('events.*.eventName').optional().trim().notEmpty().withMessage('Event name is required'),
  body('events.*.payoutAmount').optional().isFloat({ min: 0 }).withMessage('Payout amount must be a positive number'),
];

const updateOfferRules = [
  param('id').isInt().withMessage('Invalid offer id'),
  ...createOfferRules,
];

const idParamRule = [param('id').isInt().withMessage('Invalid id')];

const listOfferRequestsRules = [
  query('status').optional().isIn(['all', 'requested', 'approved', 'rejected']),
];

const moderateRequestRules = [
  param('id').isInt().withMessage('Invalid request id'),
  body('action').isIn(['approve', 'reject', 'delete']).withMessage('Invalid action'),
];

const bulkModerateRules = [
  body('action').isIn(['approve_selected', 'reject_selected', 'delete_selected']).withMessage('Invalid action'),
  body('requestIds').isArray({ min: 1 }).withMessage('requestIds is required'),
];

const requestOfferRules = [param('id').isInt().withMessage('Invalid offer id')];

module.exports = {
  createOfferRules,
  updateOfferRules,
  idParamRule,
  listOfferRequestsRules,
  moderateRequestRules,
  bulkModerateRules,
  requestOfferRules,
};
