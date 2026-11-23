const express = require('express');
const { param } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const validate = require('../validators/handleValidation');
const controller = require('../controllers/campaignCashbackPayout.controller');

const router = express.Router();
router.use(requireAdmin);
router.get('/', controller.list);
router.post('/:id/pay', controller.pay);
router.post('/:id/mark-paid', [param('id').isInt().withMessage('Invalid payout id')], validate, controller.markPaidManually);
router.get('/:id/status', controller.refresh);
module.exports = router;
