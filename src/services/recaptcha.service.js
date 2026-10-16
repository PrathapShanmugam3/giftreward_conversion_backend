const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

// Verifies a Google reCAPTCHA v2 response token. If no secret is configured
// (local dev), verification is skipped so auth flows remain testable —
// mirrors how the legacy app's SECRET lived in site_config and was sometimes
// blank in dev/staging copies.
async function verifyRecaptcha(token) {
  if (!env.recaptcha.secretKey) {
    logger.warn('reCAPTCHA secret not configured — skipping verification (dev mode)');
    return true;
  }
  if (!token) return false;

  try {
    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: env.recaptcha.secretKey, response: token } }
    );
    return !!data.success;
  } catch (err) {
    logger.error('reCAPTCHA verification request failed', { message: err.message });
    return false;
  }
}

module.exports = { verifyRecaptcha };
