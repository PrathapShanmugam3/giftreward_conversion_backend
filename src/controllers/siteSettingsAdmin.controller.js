const asyncHandler = require('../utils/asyncHandler');
const siteSettingsService = require('../services/siteSettings.service');
const siteAssetService = require('../services/siteAsset.service');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await siteSettingsService.getSiteSettings();
  res.json({ success: true, settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await siteSettingsService.updateSiteSettings(req.body);
  res.json({ success: true, message: 'Site settings updated successfully', settings });
});

const updateAdminEmail = asyncHandler(async (req, res) => {
  const result = await siteSettingsService.updateAdminEmail(req.body.email);
  res.json({ success: true, ...result });
});

const uploadAsset = asyncHandler(async (req, res) => {
  const url = await siteAssetService.saveSiteAsset(req.params.kind, req.file);
  res.json({ success: true, message: `${req.params.kind === 'banner' ? 'Banner' : 'Favicon'} uploaded successfully`, url });
});

module.exports = {
  uploadAsset,
  getSettings,
  updateSettings,
  updateAdminEmail,
};
