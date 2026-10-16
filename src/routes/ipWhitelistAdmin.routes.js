const express = require('express');
const controller = require('../controllers/ipWhitelistAdmin.controller');
const validate = require('../validators/handleValidation');
const {
  listRules,
  addIpRules,
  toggleStatusRules,
  idParamRule,
  bulkActionRules,
} = require('../validators/ipWhitelist.validators');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// NOTE: literal path (/bulk) must be registered before /:id, or Express
// matches "bulk" as an :id first — same convention as offerAdmin.routes.js.
router.post('/bulk', bulkActionRules, validate, controller.bulkAction);

router.get('/', listRules, validate, controller.listIpWhitelist);
router.post('/', addIpRules, validate, controller.addIp);
router.post('/:id/toggle', toggleStatusRules, validate, controller.toggleStatus);
router.delete('/:id', idParamRule, validate, controller.deleteIp);

module.exports = router;
