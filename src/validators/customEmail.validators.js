const { body } = require('express-validator');

const sendRules = [
  body('recipientType').isIn(['all', 'selected', 'single']).withMessage('Invalid recipient type'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('publisherIds')
    .if(body('recipientType').equals('selected'))
    .isArray({ min: 1 })
    .withMessage('Select at least one publisher'),
  body('singlePublisherId')
    .if(body('recipientType').equals('single'))
    .isInt()
    .withMessage('Select a publisher'),
];

module.exports = { sendRules };
