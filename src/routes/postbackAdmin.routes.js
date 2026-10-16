const express = require('express');
const controller = require('../controllers/postbackAdmin.controller');
const validate = require('../validators/handleValidation');
const { idParamRule, listRules, moderateRules, logListRules } = require('../validators/postbackAdmin.validators');
const { requireAdmin } = require('../middleware/auth');

// Mounted twice in routes/index.js:
//   /admin/postbacks      -> approval CRUD (mirrors sadmin/approve_postback.php)
//   /admin/postbacks-log  -> last-100 log viewer (mirrors sadmin/postbacks.php)
// Kept in one router file since both operate on the same small postback
// domain and share requireAdmin + validators; the two mount points are what
// give each its own clean route name.
const approvalRouter = express.Router();
approvalRouter.use(requireAdmin);
approvalRouter.get('/', listRules, validate, controller.listPostbacks);
approvalRouter.post('/:id/moderate', moderateRules, validate, controller.moderatePostback);

const logRouter = express.Router();
logRouter.use(requireAdmin);
logRouter.get('/', logListRules, validate, controller.listPostbackLogs);

module.exports = { approvalRouter, logRouter };
