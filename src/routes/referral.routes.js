const express = require('express');
const controller = require('../controllers/referral.controller');

const router = express.Router();

// Public referral-code generator. Mounted at /api/refer in routes/index.js
// (the React page at /refer calls this; see landing.routes.js for why).
router.get('/', controller.getReferralData);
router.post('/', controller.submitReferral);

module.exports = router;
