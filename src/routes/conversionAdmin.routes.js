const express = require('express');
const controller = require('../controllers/conversionAdmin.controller');
const validate = require('../validators/handleValidation');
const { updateConversionStatusRules } = require('../validators/wallet.validators');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

router.get('/', controller.listConversions);
router.post('/:id/status', updateConversionStatusRules, validate, controller.updateStatus);

module.exports = router;
