const { body } = require('express-validator');

const registerPublisherRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('contactNumber').trim().notEmpty().withMessage('Contact number is required'),
];

const loginPublisherRules = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordRules = [body('email').trim().isEmail().withMessage('Valid email is required')];

const resetPasswordRules = [
  body('token').trim().notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginAdminRules = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  registerPublisherRules,
  loginPublisherRules,
  forgotPasswordRules,
  resetPasswordRules,
  loginAdminRules,
};
