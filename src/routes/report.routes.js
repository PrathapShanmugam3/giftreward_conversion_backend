const express = require('express');
const controller = require('../controllers/report.controller');
const { requirePublisher } = require('../middleware/auth');

const router = express.Router();
router.use(requirePublisher);

router.get('/summary', controller.getSummary);
router.get('/detailed', controller.getDetailed);
router.get('/export', controller.exportReport);

module.exports = router;
