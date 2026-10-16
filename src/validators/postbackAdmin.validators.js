const { body, param, query } = require('express-validator');

const idParamRule = [param('id').isInt().withMessage('Invalid id')];

const listRules = [
  query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  query('offerId').optional().isInt().withMessage('Invalid offerId'),
  query('userId').optional().isInt().withMessage('Invalid userId'),
  query('search').optional().trim(),
];

// Mirrors sadmin/approve_postback.php: action=update|delete|approve|reject.
// routes.md shows no bulk_action for this page (unlike approve_ofr.php),
// so this port does not add one either.
const moderateRules = [
  param('id').isInt().withMessage('Invalid postback id'),
  body('action').isIn(['approve', 'reject', 'delete', 'update']).withMessage('Invalid action'),
  body('event').optional().trim().notEmpty(),
  body('userId').optional().isInt(),
  body('offerId').optional().isInt(),
  body('postbackUrl').optional().trim().notEmpty(),
  body('status').optional().isIn(['pending', 'approved', 'rejected']),
];

const logListRules = [query('limit').optional().isInt({ min: 1, max: 100 }).toInt()];

module.exports = { idParamRule, listRules, moderateRules, logListRules };
