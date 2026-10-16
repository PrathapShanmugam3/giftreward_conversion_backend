const asyncHandler = require('../utils/asyncHandler');
const siteSettingsService = require('../services/siteSettings.service');

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

module.exports = {
  getSettings,
  updateSettings,
  updateAdminEmail,
};
