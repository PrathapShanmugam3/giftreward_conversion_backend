const { Admin, Offer, OfferEvent } = require('../models');
const ApiError = require('../utils/ApiError');
const { randomHex } = require('../utils/tokens');
const postbackService = require('./postback.service');

// Mirrors sadmin/postback.php: shows the admin's postback token/URL and
// lets them regenerate it. Legacy stored the long-form template
// (postback.php?click_id=&event=&key=); the port's canonical public URL is
// the short form (/postback/{tid}/{event}/{key}), see go.routes.js /
// postbackShort.routes.js — documented here instead of the legacy shape.
async function getPostbackInfo(adminId, appBaseUrl) {
  const admin = await Admin.findByPk(adminId);
  if (!admin) throw ApiError.notFound('Admin not found');
  return {
    token: admin.token,
    postbackUrl: `${appBaseUrl}/postback/{tid}/{event}/${admin.token}`,
  };
}

async function resetToken(adminId, appBaseUrl) {
  const admin = await Admin.findByPk(adminId);
  if (!admin) throw ApiError.notFound('Admin not found');
  admin.token = randomHex(32);
  await admin.save();
  return {
    token: admin.token,
    postbackUrl: `${appBaseUrl}/postback/{tid}/{event}/${admin.token}`,
  };
}

async function listOffersForFire() {
  return Offer.findAll({
    where: { status: 'active' },
    attributes: ['id', 'name'],
    order: [['name', 'ASC']],
  });
}

async function listEventsForOffer(offerId) {
  return OfferEvent.findAll({
    where: { offerId },
    attributes: ['id', 'eventName'],
  });
}

// Mirrors sadmin/firepostback.php: replay/test-fire the postback flow for a
// batch of click IDs against a chosen offer event. The legacy page built a
// URL and cURLed the PUBLIC postback.php endpoint over the network — a
// needless external round-trip (and, since the hostname was hardcoded, a
// latent bug waiting to fire against the wrong domain after any migration).
// This calls the same postbackService.processPostback() the public
// /postback route itself calls, in-process, so there is no SSRF-shaped
// "fetch whatever URL we build" step at all.
async function fireBatch({ adminId, tids, eventName, advertiserIp }) {
  const admin = await Admin.findByPk(adminId);
  if (!admin) throw ApiError.notFound('Admin not found');

  const results = [];
  for (const tid of tids) {
    try {
      const result = await postbackService.processPostback({
        clickId: tid,
        event: eventName,
        key: admin.token,
        offerId: undefined,
        advertiserIp,
      });
      results.push({ tid, success: true, conversionId: result.conversionId, payout: result.payout });
    } catch (err) {
      results.push({ tid, success: false, message: err.message || 'Failed' });
    }
  }
  return results;
}

module.exports = { getPostbackInfo, resetToken, listOffersForFire, listEventsForOffer, fireBatch };
