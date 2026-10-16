const express = require('express');
const controller = require('../controllers/wallet.controller');
const validate = require('../validators/handleValidation');
const { requestWithdrawalRules, invoiceParamRule } = require('../validators/wallet.validators');
const { requirePublisher } = require('../middleware/auth');

const router = express.Router();
router.use(requirePublisher);

router.get('/', controller.getOverview);
router.post('/withdrawals', requestWithdrawalRules, validate, controller.requestWithdrawal);
router.get('/withdrawals/:id/invoice', invoiceParamRule, validate, controller.getInvoice);

module.exports = router;
