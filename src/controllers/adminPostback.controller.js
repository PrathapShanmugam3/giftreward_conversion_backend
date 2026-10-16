const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const adminPostbackService = require('../services/adminPostback.service');

const getInfo = asyncHandler(async (req, res) => {
  const info = await adminPostbackService.getPostbackInfo(req.auth.sub, env.appBaseUrl);
  res.json({ success: true, ...info });
});

const resetToken = asyncHandler(async (req, res) => {
  const info = await adminPostbackService.resetToken(req.auth.sub, env.appBaseUrl);
  res.json({ success: true, message: 'Token has been reset successfully!', ...info });
});

const listOffers = asyncHandler(async (req, res) => {
  const offers = await adminPostbackService.listOffersForFire();
  res.json({ success: true, offers });
});

const listEvents = asyncHandler(async (req, res) => {
  const events = await adminPostbackService.listEventsForOffer(req.params.offerId);
  res.json({ success: true, events });
});

const fireBatch = asyncHandler(async (req, res) => {
  const { tids, eventName } = req.body;
  const results = await adminPostbackService.fireBatch({
    adminId: req.auth.sub,
    tids,
    eventName,
    advertiserIp: req.ip,
  });
  res.json({ success: true, results });
});

module.exports = { getInfo, resetToken, listOffers, listEvents, fireBatch };
