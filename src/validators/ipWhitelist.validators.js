const { body, param, query } = require('express-validator');

const idParamRule = [param('id').isInt().withMessage('Invalid id')];

const listRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
];

// Mirrors sadmin/ip_whitelist.php add_ip: the "input" field accepts either a
// raw IP address OR a URL, which the service resolves via DNS (see
// ipWhitelist.service.js resolveToIp). Exactly one of ip/url must be sent by
// the client-facing form, but we accept a single free-form `input` field so
// the service can decide which it is, same as the legacy single text box.
const addIpRules = [
  body('input').trim().notEmpty().withMessage('IP address or URL is required'),
  body('description').optional({ nullable: true }).trim(),
  body('status').optional().isIn([0, 1, '0', '1']).withMessage('Status must be 0 or 1'),
];

const toggleStatusRules = [param('id').isInt().withMessage('Invalid id')];

const bulkActionRules = [
  body('action').isIn(['activate', 'deactivate', 'delete']).withMessage('Invalid bulk action'),
  body('ids').isArray({ min: 1 }).withMessage('ids is required'),
  body('ids.*').isInt().withMessage('ids must be integers'),
];

module.exports = {
  idParamRule,
  listRules,
  addIpRules,
  toggleStatusRules,
  bulkActionRules,
};
