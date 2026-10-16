const { body, param } = require('express-validator');

const GATEWAY_TYPES = ['api', 'manual'];
const GATEWAY_STATUSES = ['active', 'inactive', 'testing'];

const createGatewayRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('type').isIn(GATEWAY_TYPES).withMessage('Invalid gateway type'),
  body('status').optional().isIn(GATEWAY_STATUSES).withMessage('Invalid status'),
  body('config.apiEndpoint').optional({ nullable: true }).trim(),
  body('config.apiMethod').optional().isIn(['POST', 'GET', 'PUT', 'DELETE']).withMessage('Invalid API method'),
  body('parameters').optional().isArray().withMessage('parameters must be an array'),
  body('parameters.*.paramKey').optional().trim().notEmpty().withMessage('Parameter key is required'),
];

const updateGatewayRules = [
  param('id').isInt().withMessage('Invalid gateway id'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('type').optional().isIn(GATEWAY_TYPES).withMessage('Invalid gateway type'),
  body('status').optional().isIn(GATEWAY_STATUSES).withMessage('Invalid status'),
  body('config.apiEndpoint').optional({ nullable: true }).trim(),
  body('config.apiMethod').optional().isIn(['POST', 'GET', 'PUT', 'DELETE']).withMessage('Invalid API method'),
  body('parameters').optional().isArray().withMessage('parameters must be an array'),
  body('parameters.*.paramKey').optional().trim().notEmpty().withMessage('Parameter key is required'),
];

const idParamRule = [param('id').isInt().withMessage('Invalid id')];

module.exports = {
  createGatewayRules,
  updateGatewayRules,
  idParamRule,
};
