const { body, param } = require('express-validator');

const requestWithdrawalRules = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('method').isIn(['upi', 'bank', 'paypal']).withMessage('Invalid withdrawal method'),
  body('details').trim().notEmpty().withMessage('Withdrawal details are required'),
];

const invoiceParamRule = [param('id').isInt().withMessage('Invalid withdrawal id')];

const updateWithdrawalStatusRules = [
  param('id').isInt().withMessage('Invalid withdrawal id'),
  body('status').isIn(['approved', 'rejected']).withMessage('Invalid status value'),
  body('notes').optional().isString(),
];

const updateConversionStatusRules = [
  param('id').isInt().withMessage('Invalid conversion id'),
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status value'),
];

module.exports = {
  requestWithdrawalRules,
  invoiceParamRule,
  updateWithdrawalStatusRules,
  updateConversionStatusRules,
};
