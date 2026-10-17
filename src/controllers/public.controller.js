const asyncHandler = require('../utils/asyncHandler');
const publicService = require('../services/public.service');
const siteAssetService = require('../services/siteAsset.service');

const getSite = asyncHandler(async (req, res) => {
  const site = await publicService.getPublicSite();
  res.json({ success: true, site });
});

const getLatestOffers = asyncHandler(async (req, res) => {
  const offers = await publicService.getLatestOffers();
  res.json({ success: true, offers });
});

const getAsset = asyncHandler(async (req, res) => {
  const asset = await siteAssetService.getSiteAsset(req.params.kind);
  res.set('Content-Type', asset.mimeType);
  // URL carries a ?v= cache-buster that changes on every re-upload.
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(asset.data);
});

module.exports = { getSite, getLatestOffers, getAsset };
