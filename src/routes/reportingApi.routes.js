const express = require('express');
const controller = require('../controllers/reportingApi.controller');

const router = express.Router();

// GET /report?auth-token=&report=1..5 — mounted at /report in app.js
// (replaces legacy api.php). No auth middleware; auth-token in the query
// IS the credential.
router.get('/', controller.getReport);

module.exports = router;
