const { Campaign, Offer, OfferEvent } = require('../models');
const ApiError = require('../utils/ApiError');
const { uniqid } = require('../utils/tokens');
const env = require('../config/env');

// Builds the per-event config object stored as campaign.eventConfig:
//   { [eventName]: { user_cashback, referral_cashback, max_payout, your_profit } }
// Mirrors create-camp.php / edit-campaign.php exactly, including the clamp
// of cashback values to max_payout.
function buildEventConfig(events) {
  const config = {};
  for (const e of events || []) {
    const maxPayout = Number(e.maxPayout);
    let userCashback = Number(e.cashback);
    let referralCashback = e.referralCashback !== undefined ? Number(e.referralCashback) : 0;

    if (userCashback > maxPayout) userCashback = maxPayout;
    if (referralCashback > maxPayout) referralCashback = maxPayout;

    config[e.name] = {
      user_cashback: userCashback,
      referral_cashback: referralCashback,
      max_payout: maxPayout,
      your_profit: maxPayout - userCashback - referralCashback,
    };
  }
  return config;
}

async function listCampaigns(userId) {
  return Campaign.findAll({
    where: { userId },
    include: [{ model: Offer, attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });
}

async function getCampaign(userId, campaignRowId) {
  const campaign = await Campaign.findOne({
    where: { id: campaignRowId, userId },
    include: [{ model: Offer, attributes: ['id', 'name'] }],
  });
  if (!campaign) throw ApiError.notFound('Campaign not found or you do not have permission to view it');
  return campaign;
}

async function createCampaign(userId, { offerId, events, steps, referralEnabled }) {
  const offer = await Offer.findByPk(offerId);
  if (!offer) throw ApiError.badRequest('Invalid offer selected');

  const eventConfig = buildEventConfig(events);
  const campaignId = uniqid();
  // Always build links against the public frontend URL (env.frontendUrl),
  // never the inbound request's Host header — that header reflects
  // whatever reverse proxy/dev-proxy forwarded the request and is not a
  // reliable source for a public, shareable link.
  const campaignLink = `${env.frontendUrl}/o?o=${offerId}&pid=${userId}&cid=${campaignId}`;
  const referralLink = `${env.frontendUrl}/refer?o=${offerId}&pid=${userId}&cid=${campaignId}`;

  const campaign = await Campaign.create({
    userId,
    offerId,
    eventConfig: JSON.stringify(eventConfig),
    steps: JSON.stringify(steps || []),
    referralEnabled: referralEnabled ? 1 : 0,
    campaignId,
    campaignLink,
    referralLink,
    status: 'active',
  });

  return {
    campaign,
    campaignLink,
    referralLink: referralEnabled ? referralLink : null,
  };
}

async function updateCampaign(userId, campaignRowId, { offerId, events, steps, referralEnabled }) {
  const campaign = await Campaign.findOne({ where: { id: campaignRowId, userId } });
  if (!campaign) throw ApiError.notFound('Campaign not found or you do not have permission to edit it');

  const eventConfig = buildEventConfig(events);

  campaign.offerId = offerId;
  campaign.eventConfig = JSON.stringify(eventConfig);
  campaign.steps = JSON.stringify(steps || []);
  campaign.referralEnabled = referralEnabled ? 1 : 0;
  await campaign.save();

  return campaign;
}

async function setCampaignStatus(userId, campaignRowId, status) {
  if (!['active', 'paused'].includes(status)) throw ApiError.badRequest('Invalid status value');

  const campaign = await Campaign.findOne({ where: { id: campaignRowId, userId } });
  if (!campaign) throw ApiError.notFound('Campaign not found or you do not have permission to modify it');

  campaign.status = status;
  await campaign.save();
  return campaign;
}

async function deleteCampaign(userId, campaignRowId) {
  const campaign = await Campaign.findOne({ where: { id: campaignRowId, userId } });
  if (!campaign) throw ApiError.notFound('Campaign not found or you do not have permission to delete it');

  await campaign.destroy();
  return { message: 'Campaign deleted successfully' };
}

// Used by the create/edit campaign form to populate the event picker.
async function getOfferEventsForCampaign(offerId) {
  const events = await OfferEvent.findAll({ where: { offerId }, attributes: ['eventName', 'payoutAmount'] });
  return events.map((e) => ({ eventName: e.eventName, payoutAmount: e.payoutAmount }));
}

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  setCampaignStatus,
  deleteCampaign,
  getOfferEventsForCampaign,
  buildEventConfig,
};
