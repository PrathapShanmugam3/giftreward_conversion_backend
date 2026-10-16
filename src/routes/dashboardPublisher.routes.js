const express = require('express');
const controller = require('../controllers/dashboardPublisher.controller');
const { requirePublisher } = require('../middleware/auth');

const router = express.Router();
router.use(requirePublisher);
router.get('/', controller.getDashboard);

module.exports = router;
