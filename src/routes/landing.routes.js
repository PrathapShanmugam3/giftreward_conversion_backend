const express = require('express');
const controller = require('../controllers/landing.controller');

const router = express.Router();

// Public campaign landing data. GET returns the offer/cashback info, POST
// submits the UPI/mobile/name form. Mounted at /api/o in routes/index.js —
// the React page at /o (same path the end user visits) calls this. Kept
// separate from the page path so the two don't collide (see app.js).
router.get('/', controller.getLandingData);
router.post('/', controller.submitLandingForm);

module.exports = router;
