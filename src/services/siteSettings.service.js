const { SiteConfig, Admin } = require('../models');
const ApiError = require('../utils/ApiError');

// Mirrors sadmin/settings.php: a single site_config row (id=1) plus
// admins.email (id=1), both editable from the same admin settings page.
// Legacy PHP also uploads `banner`/`favicon` image files to ../uploads/ and
// stores the resulting path in these same columns. This port does NOT
// implement multipart file upload handling (see report) — banner/favicon
// are accepted here as plain string paths/URLs, same as every other field.
// Telegram bot token/chat id are stored on the same row but are NOT edited
// by this legacy page (site_config.md: "Telegram fields not editable here");
// they're exposed read-only via getSiteSettings so the admin UI can display
// them, and intentionally left out of the updatable field list.

const SITE_CONFIG_ID = 1;
const ADMIN_ID = 1;

const EDITABLE_FIELDS = [
  'siteName',
  'banner',
  'favicon',
  'domain',
  'minimumWithdrawal',
  'currency',
  'recapthaa',
  'sitekey',
  'secret',
  'wstatus',
];

async function getSiteSettings() {
  const [config, admin] = await Promise.all([
    SiteConfig.findByPk(SITE_CONFIG_ID),
    Admin.findByPk(ADMIN_ID, { attributes: ['id', 'email'] }),
  ]);
  if (!config) throw ApiError.notFound('Site config not found');

  return {
    ...config.toJSON(),
    adminEmail: admin ? admin.email : null,
  };
}

async function updateSiteSettings(payload) {
  const config = await SiteConfig.findByPk(SITE_CONFIG_ID);
  if (!config) throw ApiError.notFound('Site config not found');

  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates[field] = payload[field];
    }
  }

  await config.update(updates);
  return getSiteSettings();
}

async function updateAdminEmail(email) {
  const admin = await Admin.findByPk(ADMIN_ID);
  if (!admin) throw ApiError.notFound('Admin not found');

  admin.email = email;
  await admin.save();
  return { message: 'Admin email updated successfully', email: admin.email };
}

module.exports = {
  SITE_CONFIG_ID,
  ADMIN_ID,
  getSiteSettings,
  updateSiteSettings,
  updateAdminEmail,
};
