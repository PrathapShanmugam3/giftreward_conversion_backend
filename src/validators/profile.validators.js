const { body } = require('express-validator');

const updateProfileRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('contactNumber').trim().notEmpty().withMessage('Contact number is required'),
  body('newPassword').optional({ nullable: true }).isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

module.exports = { updateProfileRules };
