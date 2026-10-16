const { body } = require('express-validator');

const submitRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional({ nullable: true }).trim(),
  body('subject').optional({ nullable: true }).trim(),
  body('message').optional({ nullable: true }).trim(),
  body('source').optional({ nullable: true }).trim(),
];

module.exports = { submitRules };
