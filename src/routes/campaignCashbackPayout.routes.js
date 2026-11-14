const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/campaignCashbackPayout.controller');

const router = express.Router();
router.use(requireAdmin);
router.get('/', controller.list);
router.post('/:id/pay', controller.pay);
router.get('/:id/status', controller.refresh);
module.exports = router;
