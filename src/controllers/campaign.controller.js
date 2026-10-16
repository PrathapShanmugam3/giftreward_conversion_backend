const asyncHandler = require('../utils/asyncHandler');
const campaignService = require('../services/campaign.service');
const campaignStatsService = require('../services/campaignStats.service');

const listCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await campaignService.listCampaigns(req.auth.sub);
  res.json({ success: true, campaigns });
});

const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.getCampaign(req.auth.sub, req.params.id);
  res.json({ success: true, campaign });
});

const createCampaign = asyncHandler(async (req, res) => {
  const result = await campaignService.createCampaign(req.auth.sub, req.body);
  res.status(201).json({ success: true, ...result });
});

const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.updateCampaign(req.auth.sub, req.params.id, req.body);
  res.json({ success: true, message: 'Campaign updated successfully', campaign });
});

const setCampaignStatus = asyncHandler(async (req, res) => {
  const campaign = await campaignService.setCampaignStatus(req.auth.sub, req.params.id, req.body.status);
  res.json({ success: true, message: `Campaign status updated to ${campaign.status}`, campaign });
});

const deleteCampaign = asyncHandler(async (req, res) => {
  const result = await campaignService.deleteCampaign(req.auth.sub, req.params.id);
  res.json({ success: true, ...result });
});

const getOfferEvents = asyncHandler(async (req, res) => {
  const events = await campaignService.getOfferEventsForCampaign(req.params.offerId);
  res.json({ success: events.length > 0, events });
});

const getCampaignStats = asyncHandler(async (req, res) => {
  const stats = await campaignStatsService.getCampaignStats(req.auth.sub, req.params.id);
  res.json({ success: true, ...stats });
});

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  setCampaignStatus,
  deleteCampaign,
  getOfferEvents,
  getCampaignStats,
};
