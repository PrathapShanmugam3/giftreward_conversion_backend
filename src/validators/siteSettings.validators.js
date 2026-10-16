const { body } = require('express-validator');

const updateSiteSettingsRules = [
  body('siteName').optional().trim().notEmpty().withMessage('Site name cannot be empty'),
  body('banner').optional().trim(),
  body('favicon').optional().trim(),
  body('domain').optional().trim().notEmpty().withMessage('Domain cannot be empty'),
  body('minimumWithdrawal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum withdrawal must be a positive number'),
  body('currency').optional().trim().isLength({ min: 1, max: 3 }).withMessage('Invalid currency code'),
  body('recapthaa').optional().trim(),
  body('sitekey').optional().trim(),
  body('secret').optional().trim(),
  body('wstatus').optional().trim().isIn(['0', '1']).withMessage('wstatus must be "0" or "1"'),
];

const updateAdminEmailRules = [
  body('email').trim().isEmail().withMessage('A valid email is required'),
];

module.exports = {
  updateSiteSettingsRules,
  updateAdminEmailRules,
};
