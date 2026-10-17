const { SiteAsset, SiteConfig } = require('../models');
const ApiError = require('../utils/ApiError');

// site_assets isn't part of the imported legacy schema, so create it the
// first time it's touched instead of requiring a manual migration step on
// every environment (local MySQL, TiDB on Vercel).
let ensured = null;
function ensureTable() {
  ensured = ensured || SiteAsset.sync();
  return ensured;
}

function publicUrl(kind) {
  // Cache-busting query so browsers pick up a re-upload immediately.
  return `/api/public/assets/${kind}?v=${Date.now()}`;
}

// Replaces sadmin/settings.php's move_uploaded_file() into ../uploads/:
// store the bytes, then point site_config.banner / site_config.favicon at
// the URL that serves them.
async function saveSiteAsset(kind, file) {
  await ensureTable();
  const existing = await SiteAsset.findOne({ where: { kind } });
  if (existing) {
    await existing.update({ mimeType: file.mimetype, data: file.buffer });
  } else {
    await SiteAsset.create({ kind, mimeType: file.mimetype, data: file.buffer });
  }

  const config = await SiteConfig.findByPk(1);
  if (!config) throw ApiError.notFound('Site config not found');
  const url = publicUrl(kind);
  await config.update({ [kind]: url });
  return url;
}

async function getSiteAsset(kind) {
  await ensureTable();
  const asset = await SiteAsset.findOne({ where: { kind } });
  if (!asset) throw ApiError.notFound('Asset not found');
  return asset;
}

module.exports = { saveSiteAsset, getSiteAsset };
