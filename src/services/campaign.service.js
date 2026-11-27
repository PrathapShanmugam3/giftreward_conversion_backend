const { Campaign, Offer, OfferEvent } = require('../models');
const ApiError = require('../utils/ApiError');
const { uniqid } = require('../utils/tokens');
const env = require('../config/env');

function amountInCents(value, label) {
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount < 0 || Math.abs(amount * 100 - cents) > 1e-6) {
    throw ApiError.badRequest(`${label} must be a non-negative amount with at most two decimal places`);
  }
  return cents;
}

function isReferralEnabled(value) {
  return value === true || value === 'true' || value === 1;
}

function buildEventConfig(events, offerEvents, referralEnabled) {
  const config = Object.create(null);
  const enabledReferrals = isReferralEnabled(referralEnabled);
  const seen = new Set();

  for (const e of events || []) {
    const name = String(e.name || '').trim();
    const matchingEvents = offerEvents.filter((offerEvent) => offerEvent.eventName === name);
    if (!name || matchingEvents.length !== 1) {
      throw ApiError.badRequest(`Event "${name}" is not a unique event on the selected offer`);
    }
    if (seen.has(name)) throw ApiError.badRequest(`Event "${name}" was selected more than once`);
    seen.add(name);

    const maxPayoutCents = amountInCents(matchingEvents[0].payoutAmount, `Offer payout for ${name}`);
    const userCashbackCents = amountInCents(e.cashback, `User cashback for ${name}`);
    const referralCashbackCents = enabledReferrals
      ? amountInCents(e.referralCashback === undefined ? 0 : e.referralCashback, `Referral cashback for ${name}`)
      : 0;
    if (userCashbackCents + referralCashbackCents > maxPayoutCents) {
      throw ApiError.badRequest(`User and referral cashback for "${name}" cannot exceed the offer payout of ${(maxPayoutCents / 100).toFixed(2)}`);
    }

    config[name] = {
      user_cashback: userCashbackCents / 100,
      referral_cashback: referralCashbackCents / 100,
      max_payout: maxPayoutCents / 100,
      your_profit: (maxPayoutCents - userCashbackCents - referralCashbackCents) / 100,
    };
  }
  if (!seen.size) throw ApiError.badRequest('At least one valid offer event is required');
  return config;
}

async function listCampaigns(userId) {
  const campaigns = await Campaign.findAll({
    where: { userId },
    include: [{ model: Offer, attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });
  return campaigns.map(withPublicLinks);
}

// Link URLs are derived from configuration when returned, so campaigns created
// before the production URLs were configured do not keep showing localhost.
function withPublicLinks(campaign) {
  const row = campaign.toJSON();
  const base = env.frontendUrl.replace(/\/$/, '');
  row.campaignLink = `${base}/o?o=${row.offerId}&pid=${row.userId}&cid=${row.campaignId}`;
  row.referralLink = `${base}/refer?o=${row.offerId}&pid=${row.userId}&cid=${row.campaignId}`;
  return row;
}

async function getCampaign(userId, campaignRowId) {
  const campaign = await Campaign.findOne({
    where: { id: campaignRowId, userId },
    include: [{ model: Offer, attributes: ['id', 'name'] }],
  });
  if (!campaign) throw ApiError.notFound('Campaign not found or you do not have permission to view it');
  return withPublicLinks(campaign);
}

async function createCampaign(userId, { offerId, events, steps, referralEnabled }) {
  const offer = await Offer.findByPk(offerId);
  if (!offer) throw ApiError.badRequest('Invalid offer selected');

  const offerEvents = await OfferEvent.findAll({ where: { offerId }, attributes: ['eventName', 'payoutAmount'] });
  const eventConfig = buildEventConfig(events, offerEvents, referralEnabled);
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
    referralEnabled: isReferralEnabled(referralEnabled) ? 1 : 0,
    campaignId,
    campaignLink,
    referralLink,
    status: 'active',
  });

  return {
    campaign,
    campaignLink,
    referralLink: isReferralEnabled(referralEnabled) ? referralLink : null,
  };
}

async function updateCampaign(userId, campaignRowId, { offerId, events, steps, referralEnabled }) {
  const campaign = await Campaign.findOne({ where: { id: campaignRowId, userId } });
  if (!campaign) throw ApiError.notFound('Campaign not found or you do not have permission to edit it');
  if (Number(campaign.offerId) !== Number(offerId)) {
    throw ApiError.badRequest('The offer on an existing campaign cannot be changed');
  }

  const offerEvents = await OfferEvent.findAll({ where: { offerId }, attributes: ['eventName', 'payoutAmount'] });
  const eventConfig = buildEventConfig(events, offerEvents, referralEnabled);

  campaign.offerId = offerId;
  campaign.eventConfig = JSON.stringify(eventConfig);
  campaign.steps = JSON.stringify(steps || []);
  campaign.referralEnabled = isReferralEnabled(referralEnabled) ? 1 : 0;
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
