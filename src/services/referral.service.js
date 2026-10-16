const { Offer, Campaign, ReferUser } = require('../models');
const ApiError = require('../utils/ApiError');
const { sanitize } = require('../utils/sanitize');

const UPI_RE = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/i;
const CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateReferralCode() {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// FIX (quirks.md): legacy generated an 8-char code with Math.random-style
// rand() and never checked for collisions. We keep the same code shape
// (8 chars, [0-9A-Z]) but retry on collision since refer_code isn't a
// unique-constrained column and a silent collision would let two referrers
// share one link.
async function generateUniqueReferralCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateReferralCode();
    const exists = await ReferUser.findOne({ where: { referCode: code } });
    if (!exists) return code;
  }
  throw ApiError.internal('Could not generate a unique referral code, please try again');
}

function totalReferralCashback(eventConfig) {
  let total = 0;
  for (const event of Object.values(eventConfig || {})) {
    if (typeof event.referral_cashback === 'number') total += event.referral_cashback;
  }
  return total;
}

async function getReferralPageData({ offerId, campaignId }) {
  let offerName = '';
  if (offerId) {
    const offer = await Offer.findByPk(offerId);
    offerName = offer?.name || '';
  }

  let steps = [];
  let eventConfig = {};
  if (campaignId) {
    const campaign = await Campaign.findOne({ where: { campaignId } });
    if (campaign) {
      try {
        steps = JSON.parse(campaign.steps || '[]');
      } catch {
        steps = [];
      }
      try {
        eventConfig = JSON.parse(campaign.eventConfig || '{}');
      } catch {
        eventConfig = {};
      }
    }
  }

  return {
    offerName,
    steps,
    totalReferralCashback: totalReferralCashback(eventConfig),
  };
}

// Mirrors refer/index.php POST: if (campaign_id, upi_id) already has a
// referral code, return it; otherwise generate and insert a new one.
async function submitReferral({ offerId, userId, campaignId, upiId, telegramChannel, ip }) {
  const cleanUpi = sanitize(upiId || '');
  if (!cleanUpi) throw ApiError.badRequest('Please enter your UPI ID');
  if (!UPI_RE.test(cleanUpi)) throw ApiError.badRequest('Please enter a valid UPI ID (e.g. 1234567890@upi)');

  const existing = await ReferUser.findOne({ where: { campaignId: String(campaignId), upiId: cleanUpi } });
  if (existing) {
    return {
      referralCode: existing.referCode,
      message: "You've already submitted. Here's your referral link again.",
      alreadyExists: true,
    };
  }

  const referralCode = await generateUniqueReferralCode();
  await ReferUser.create({
    campaignId: String(campaignId),
    offerId: String(offerId),
    userId: String(userId),
    upiId: cleanUpi,
    telegram: sanitize(telegramChannel || ''),
    referCode: referralCode,
    ipAddress: ip || '',
  });

  return {
    referralCode,
    message: 'Success! Your cashback will be processed within 48 hours.',
    alreadyExists: false,
  };
}

module.exports = { getReferralPageData, submitReferral, generateUniqueReferralCode };
