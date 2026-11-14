const express = require('express');
const controller = require('../controllers/trackingLookup.controller');

const router = express.Router();

// Public bank account/mobile lookup. Mounted at /tracking in app.js.
router.get('/', controller.lookup);

module.exports = router;
