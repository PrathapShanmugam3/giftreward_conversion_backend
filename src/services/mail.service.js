const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

// Replaces PHP mail(). If SMTP isn't configured (local dev), we log the
// email instead of throwing, so auth flows (register/forgot-password) are
// still testable end-to-end without a mail server.
let transporter = null;

function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    logger.warn('SMTP not configured — logging email instead of sending', { to, subject });
    logger.debug('Email body', html);
    return { simulated: true };
  }
  return t.sendMail({ from: env.smtp.from, to, subject, html });
}

module.exports = { sendMail };
