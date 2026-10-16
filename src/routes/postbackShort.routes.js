const express = require('express');
const controller = require('../controllers/postback.controller');
const { postbackLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// Short form: /postback/{tid}/{event}/{key} — mounted at root in app.js.
// See postback.controller.js for the fix to the legacy broken rewrite.
// Rate limiter applied on the specific route, not at the app.use() mount
// point in app.js — a limiter mounted with no path prefix runs for every
// request that reaches that point in the middleware stack, not just ones
// this router actually matches (confirmed with a standalone test).
router.get('/postback/:tid/:event/:key', postbackLimiter, controller.shortForm);

module.exports = router;
