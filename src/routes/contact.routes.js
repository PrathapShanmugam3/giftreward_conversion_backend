const express = require('express');
const controller = require('../controllers/contact.controller');
const validate = require('../validators/handleValidation');
const { submitRules } = require('../validators/contact.validators');

const router = express.Router();

// Mirrors ajax/handle-form.php (lead capture) and publisher/support.php's
// contact form (which posted nowhere in the legacy app). Public, no auth —
// covered by apiLimiter since this is mounted under /api.
router.post('/', submitRules, validate, controller.submit);

module.exports = router;
