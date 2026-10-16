const express = require('express');
const controller = require('../controllers/withdrawalAdmin.controller');
const validate = require('../validators/handleValidation');
const { updateWithdrawalStatusRules } = require('../validators/wallet.validators');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

router.get('/', controller.listWithdrawals);
router.post('/:id/status', updateWithdrawalStatusRules, validate, controller.updateStatus);

module.exports = router;
