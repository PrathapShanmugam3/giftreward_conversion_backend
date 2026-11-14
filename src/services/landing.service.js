const { Offer, Campaign, CampaignClick, ReferUser } = require('../models');
const ApiError = require('../utils/ApiError');
const { sanitize } = require('../utils/sanitize');
const env = require('../config/env');

const MOBILE_RE = /^[0-9]{10}$/;
const ACCOUNT_RE = /^[0-9]{6,20}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function accountNumberFromDetails(details = '') {
  return String(details).match(/account number:\s*([0-9]{6,20})/i)?.[1] || '';
}

function totalUserCashback(eventConfig) {
  let total = 0;
  for (const event of Object.values(eventConfig || {})) {
    if (typeof event.user_cashback === 'number') total += event.user_cashback;
  }
  return total;
}

// Mirrors o/index.php GET: offer name, campaign steps, computed cashback,
// and (if ?as=code given) the referrer's Telegram link.
async function getLandingPageData({ offerId, userId, campaignId, referCode }) {
  if (!offerId || !userId || !campaignId) {
    throw ApiError.badRequest('Invalid request parameters');
  }

  const campaign = await Campaign.findOne({ where: { campaignId } });
  if (!campaign) throw ApiError.badRequest('Invalid campaign ID');

  if (String(campaign.offerId) !== String(offerId) || String(campaign.userId) !== String(userId)) {
    throw ApiError.badRequest('Campaign link does not match this offer or publisher');
  }

  const offer = await Offer.findByPk(campaign.offerId);
  if (!offer || offer.status !== 'active' || campaign.status !== 'active') {
    return {
      offerName: 'Offer unavailable',
      offerImage: '',
      steps: [],
      totalUserCashback: 0,
      referrer: null,
      errorMessage: 'This offer or campaign is no longer available.',
      offerUnavailable: true,
    };
  }

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

// Mirrors o/index.php POST: validates name/mobile/bank details, inserts
// campaign_clicks, then hands back the /go redirect target. The actual
// redirect to /go is performed by the controller.
async function submitLandingForm({ offerId, userId, campaignId, referCode, name, mobile, accountNumber, ifsc, accountHolder, ip }) {
  if (!offerId || !userId || !campaignId) {
    throw ApiError.badRequest('Invalid request parameters');
  }

  const campaign = await Campaign.findOne({ where: { campaignId } });
  if (!campaign) throw ApiError.badRequest('Invalid campaign ID');
  if (String(campaign.offerId) !== String(offerId) || String(campaign.userId) !== String(userId)) {
    throw ApiError.badRequest('Campaign link does not match this offer or publisher');
  }
  if (campaign.status !== 'active') throw ApiError.badRequest('This campaign is no longer active');

  const offer = await Offer.findByPk(campaign.offerId);
  if (!offer || offer.status !== 'active') {
    throw ApiError.badRequest('This offer is no longer available');
  }

  const cleanName = sanitize(name || '');
  const cleanMobile = sanitize(mobile || '');
  const cleanAccount = String(accountNumber || '').trim().replace(/\D/g, '');
  const cleanIfsc = String(ifsc || '').trim().toUpperCase();
  const cleanHolder = String(accountHolder || '').trim();

  if (!cleanName || !cleanMobile || !cleanAccount || !cleanIfsc || !cleanHolder) {
    throw ApiError.badRequest('All fields are required');
  }
  if (!MOBILE_RE.test(cleanMobile)) {
    throw ApiError.badRequest('Invalid mobile number format');
  }
  if (!ACCOUNT_RE.test(cleanAccount) || !IFSC_RE.test(cleanIfsc) || cleanHolder.length > 50) {
    throw ApiError.badRequest('Enter a valid account number, IFSC and account holder name');
  }

  let eventConfig = {};
  try {
    eventConfig = JSON.parse(campaign.eventConfig || '{}');
  } catch {
    eventConfig = {};
  }
  const amount = totalUserCashback(eventConfig);

  let referrerAccount = '';
  if (referCode) {
    const refer = await ReferUser.findOne({ where: { referCode: sanitize(referCode) } });
    if (refer) referrerAccount = accountNumberFromDetails(refer.upiId);
  }

  const bankDetails = `Account Number: ${cleanAccount} | IFSC: ${cleanIfsc} | Account Holder: ${cleanHolder}`;

  await CampaignClick.create({
    offername: offer.name,
    offerid: String(offerId),
    user: String(userId),
    amount,
    upi: bankDetails,
    date: new Date(),
    ip: ip || '',
    refercode: referCode ? sanitize(referCode) : '',
    name: cleanName,
    number: cleanMobile,
  });

  const redirectTo = `/go?cid=${offerId}&uid=${userId}&p1=${encodeURIComponent(cleanAccount)}&p2=${encodeURIComponent(referrerAccount)}&sub1=${encodeURIComponent(cleanMobile)}`;
  return { redirectTo };
}

module.exports = { getLandingPageData, submitLandingForm, totalUserCashback };
