const express = require('express');
const controller = require('../controllers/publisherApiInfo.controller');
const { requirePublisher } = require('../middleware/auth');

const router = express.Router();
router.use(requirePublisher);

router.get('/', controller.getApiInfo);

module.exports = router;
