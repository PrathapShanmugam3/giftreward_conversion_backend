const path = require('path');

require('dotenv').config();

const DEFAULT_SSL_CA_PATH = path.join(__dirname, 'certs', 'ca-certificates.crt');

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    // Don't crash on import in test/dev for optional secrets; routes that need
    // them (Google OAuth, Telegram, SMTP, reCAPTCHA) check at call time instead.
    return '';
  }
  return value;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isServerless: process.env.VERCEL === '1',
  port: Number(process.env.PORT || 5000),
  appBaseUrl: required('APP_BASE_URL', 'http://localhost:5000'),
  frontendUrl: required('FRONTEND_URL', 'http://localhost:5173'),

  db: {
    host: required('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT || 3306),
    name: required('DB_NAME', 'giftreward'),
    user: required('DB_USER', 'root'),
    pass: required('DB_PASS', ''),
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true',
    sslCaPath: process.env.DB_SSL_CA || DEFAULT_SSL_CA_PATH,
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpires: required('JWT_ACCESS_EXPIRES', '15m'),
    refreshExpires: required('JWT_REFRESH_EXPIRES', '7d'),
  },

  adminBootstrap: {
    username: required('ADMIN_BOOTSTRAP_USERNAME', 'admin'),
    email: required('ADMIN_BOOTSTRAP_EMAIL', 'admin@example.com'),
    password: required('ADMIN_BOOTSTRAP_PASSWORD', ''),
  },

  recaptcha: {
    siteKey: required('RECAPTCHA_SITE_KEY', ''),
    secretKey: required('RECAPTCHA_SECRET_KEY', ''),
  },

  // Google OAuth login was in the original port scope but was explicitly
  // descoped (2026-10-14, user decision) — the legacy app's Google
  // sign-in flow is not reproduced here. users.google_id stays in the
  // schema (it's a real imported production column) but is unused by any
  // route. See CUTOVER.md for the full note.

  telegram: {
    botToken: required('TELEGRAM_BOT_TOKEN', ''),
    chatId: required('TELEGRAM_CHAT_ID', ''),
  },

  smtp: {
    host: required('SMTP_HOST', ''),
    port: Number(process.env.SMTP_PORT || 587),
    user: required('SMTP_USER', ''),
    pass: required('SMTP_PASS', ''),
    from: required('SMTP_FROM', 'GiftReward <no-reply@example.com>'),
  },

  geo: {
    ipApiUrl: required('IP_API_URL', 'http://ip-api.com/json'),
    ipapiCoUrl: required('IPAPI_CO_URL', 'https://ipapi.co'),
    ipinfoUrl: required('IPINFO_URL', 'https://ipinfo.io'),
  },

  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    domain: required('COOKIE_DOMAIN', 'localhost'),
  },
};
