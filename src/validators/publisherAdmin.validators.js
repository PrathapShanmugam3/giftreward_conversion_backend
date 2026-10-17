const { body, param, query } = require('express-validator');

const createPublisherRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('contactNumber').trim().notEmpty().withMessage('Contact number is required'),
  body('postbackUrl').optional({ values: 'falsy' }).trim().isURL({ require_protocol: true }).withMessage('Postback URL must be a valid URL'),
  body('tgChatId').optional().trim(),
  body('withdrawalStatus').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Invalid withdrawal status'),
];

const updatePublisherRules = [
  param('id').isInt().withMessage('Invalid publisher id'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('companyName').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
  body('contactNumber').optional().trim().notEmpty().withMessage('Contact number cannot be empty'),
  body('status').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Invalid status'),
  body('postbackUrl').optional({ values: 'falsy' }).trim().isURL({ require_protocol: true }).withMessage('Postback URL must be a valid URL'),
  body('tgChatId').optional().trim(),
  body('withdrawalStatus').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Invalid withdrawal status'),
];

const idParamRule = [param('id').isInt().withMessage('Invalid publisher id')];

const listPublishersRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
];

const resetPasswordRules = [
  param('id').isInt().withMessage('Invalid publisher id'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const adjustBalanceRules = [
  param('id').isInt().withMessage('Invalid publisher id'),
  body('action').isIn(['set', 'add']).withMessage('Invalid action'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
];

module.exports = {
  createPublisherRules,
  updatePublisherRules,
  idParamRule,
  listPublishersRules,
  resetPasswordRules,
  adjustBalanceRules,
};
