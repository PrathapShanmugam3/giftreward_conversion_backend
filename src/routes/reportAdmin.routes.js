const express = require('express');
const controller = require('../controllers/reportAdmin.controller');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

router.get('/', controller.getReport);
router.get('/export', controller.exportReport);
router.get('/campaign-stats', controller.getCampaignStats);

module.exports = router;
