const express = require('express');
const controller = require('../controllers/conversionPublisher.controller');
const { requirePublisher } = require('../middleware/auth');

const router = express.Router();
router.use(requirePublisher);
router.get('/', controller.listConversions);

module.exports = router;
