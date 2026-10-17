const { SiteConfig, Offer, OfferEvent } = require('../models');
const env = require('../config/env');

// Unauthenticated site info for the React shell: branding (title, banner,
// favicon), currency/min-withdrawal for marketing copy, and the reCAPTCHA
// site key the login/register pages need to render the widget. Only
// public-safe fields — never the reCAPTCHA secret or Telegram token.
async function getPublicSite() {
  const config = await SiteConfig.findByPk(1);
  return {
    siteName: config?.siteName || 'GiftReward',
    banner: config?.banner || '',
    favicon: config?.favicon || '',
    currency: config?.currency || 'INR',
    minimumWithdrawal: Number(config?.minimumWithdrawal) || 0,
    // Verification (recaptcha.service.js) uses env.recaptcha.secretKey, so
    // the matching env site key is the one that must render on the page.
    recaptchaSiteKey: env.recaptcha.siteKey || '',
  };
}

// Mirrors the legacy marketing index.php: the 3 latest active offers.
async function getLatestOffers(limit = 3) {
  const offers = await Offer.findAll({
    where: { status: 'active' },
    attributes: ['id', 'name', 'description', 'image', 'payoutType', 'category', 'createdAt'],
    include: [{ model: OfferEvent, attributes: ['eventName', 'payoutAmount'] }],
    order: [['createdAt', 'DESC']],
    limit,
  });
  return offers.map((o) => {
    const json = o.toJSON();
    return {
      id: json.id,
      name: json.name,
      description: json.description,
      image: json.image,
      payoutType: json.payoutType,
      category: json.category,
      totalPayout: (json.OfferEvents || []).reduce((sum, e) => sum + Number(e.payoutAmount), 0),
    };
  });
}

module.exports = { getPublicSite, getLatestOffers };
