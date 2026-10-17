const { Offer, Campaign, CampaignClick, ReferUser } = require('../models');
const ApiError = require('../utils/ApiError');
const { sanitize } = require('../utils/sanitize');
const env = require('../config/env');

const MOBILE_RE = /^[0-9]{10}$/;
const UPI_RE = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

function totalUserCashback(eventConfig) {
  let total = 0;
  for (const event of Object.values(eventConfig || {})) {
    if (typeof event.user_cashback === 'number') total += event.user_cashback;
  }
  return total;
}

// Mirrors o/index.php GET: offer name, campaign steps, computed cashback,
// and (if ?as=code given) the referrer's UPI + telegram link.
async function getLandingPageData({ offerId, userId, campaignId, referCode }) {
  if (!offerId || !userId || !campaignId) {
    throw ApiError.badRequest('Invalid request parameters');
  }

  const offer = await Offer.findByPk(offerId);
  if (!offer) throw ApiError.badRequest('Invalid offer ID');

  const campaign = await Campaign.findOne({ where: { campaignId } });
  if (!campaign) throw ApiError.badRequest('Invalid campaign ID');

  let steps = [];
  try {
    steps = JSON.parse(campaign.steps || '[]');
  } catch {
    steps = [];
  }

  let eventConfig = {};
  try {
    eventConfig = JSON.parse(campaign.eventConfig || '{}');
  } catch {
    eventConfig = {};
  }

  let referrer = null;
  let errorMessage = '';
  if (referCode) {
    const refer = await ReferUser.findOne({ where: { referCode: sanitize(referCode) } });
    if (refer) {
      referrer = {
        upiId: refer.upiId,
        telegram: /^https?:\/\//.test(refer.telegram || '') ? refer.telegram : '',
      };
    } else {
      errorMessage = 'Invalid Refer Code. No record found.';
    }
  }

  return {
    offerName: offer.name,
    offerImage: offer.image || '',
    steps,
    totalUserCashback: totalUserCashback(eventConfig),
    referrer,
    errorMessage,
  };
}

// Mirrors o/index.php POST: validates name/mobile/upi, inserts
// campaign_clicks, then hands back the /go redirect target. The actual
// redirect to /go is performed by the controller.
async function submitLandingForm({ offerId, userId, campaignId, referCode, name, mobile, upiId, ip }) {
  const offer = await Offer.findByPk(offerId);
  if (!offer) throw ApiError.badRequest('Invalid offer ID');
  const campaign = await Campaign.findOne({ where: { campaignId } });
  if (!campaign) throw ApiError.badRequest('Invalid campaign ID');

  const cleanName = sanitize(name || '');
  const cleanMobile = sanitize(mobile || '');
  const cleanUpi = sanitize(upiId || '');

  if (!cleanName || !cleanMobile || !cleanUpi) {
    throw ApiError.badRequest('All fields are required');
  }
  if (!MOBILE_RE.test(cleanMobile)) {
    throw ApiError.badRequest('Invalid mobile number format');
  }
  if (!UPI_RE.test(cleanUpi)) {
    throw ApiError.badRequest('Invalid UPI ID format');
  }

  let eventConfig = {};
  try {
    eventConfig = JSON.parse(campaign.eventConfig || '{}');
  } catch {
    eventConfig = {};
  }
  const amount = totalUserCashback(eventConfig);

  let referrerUpi = '';
  if (referCode) {
    const refer = await ReferUser.findOne({ where: { referCode: sanitize(referCode) } });
    if (refer) referrerUpi = refer.upiId;
  }

  await CampaignClick.create({
    offername: offer.name,
    offerid: String(offerId),
    user: String(userId),
    amount,
    upi: cleanUpi,
    date: new Date(),
    ip: ip || '',
    refercode: referCode ? sanitize(referCode) : '',
    name: cleanName,
    number: cleanMobile,
  });

  const redirectTo = `/go?cid=${offerId}&uid=${userId}&p1=${encodeURIComponent(cleanUpi)}&p2=${encodeURIComponent(referrerUpi)}&sub1=${encodeURIComponent(cleanMobile)}`;
  return { redirectTo };
}

module.exports = { getLandingPageData, submitLandingForm, totalUserCashback };
