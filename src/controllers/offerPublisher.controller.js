const asyncHandler = require('../utils/asyncHandler');
const offerService = require('../services/offer.service');

const listOffers = asyncHandler(async (req, res) => {
  const { category, payoutType, search } = req.query;
  const offers = await offerService.listOffersPublisher({ userId: req.auth.sub, category, payoutType, search });
  res.json({ success: true, offers });
});

const getOffer = asyncHandler(async (req, res) => {
  const offer = await offerService.getOfferPublisher(req.params.id, req.auth.sub);
  res.json({ success: true, offer });
});

const requestOffer = asyncHandler(async (req, res) => {
  const result = await offerService.requestOfferAccess(req.params.id, req.auth.sub);
  res.json({ success: true, ...result });
});

module.exports = { listOffers, getOffer, requestOffer };
