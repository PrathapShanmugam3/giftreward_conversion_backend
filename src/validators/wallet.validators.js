const { body, param } = require('express-validator');

const requestWithdrawalRules = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('method').equals('bank').withMessage('Only bank transfer payouts are available'),
  body('details').trim().notEmpty().withMessage('Withdrawal details are required'),
];

const invoiceParamRule = [param('id').isInt().withMessage('Invalid withdrawal id')];

const updateWithdrawalStatusRules = [
  param('id').isInt().withMessage('Invalid withdrawal id'),
  body('status').isIn(['approved', 'rejected']).withMessage('Invalid status value'),
  body('notes').optional().isString(),
  body('gatewayId').optional().isInt({ gt: 0 }).withMessage('Invalid payment gateway'),
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
