const asyncHandler = require('../utils/asyncHandler');
const offerService = require('../services/offer.service');

const listOffers = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const result = await offerService.listOffersAdmin({ status, page: Number(page), limit: Number(limit) });
  res.json({ success: true, ...result });
});

const getOffer = asyncHandler(async (req, res) => {
  const offer = await offerService.getOfferAdmin(req.params.id);
  res.json({ success: true, offer });
});

const createOffer = asyncHandler(async (req, res) => {
  const offer = await offerService.createOffer(req.body);
  res.status(201).json({ success: true, message: 'Offer created successfully', offer });
});

const updateOffer = asyncHandler(async (req, res) => {
  const offer = await offerService.updateOffer(req.params.id, req.body);
  res.json({ success: true, message: 'Offer updated successfully', offer });
});

const deleteOffer = asyncHandler(async (req, res) => {
  const result = await offerService.deleteOffer(req.params.id);
  res.json({ success: true, ...result });
});

const listOfferRequests = asyncHandler(async (req, res) => {
  const { status, offerId, userId, search } = req.query;
  const [requests, stats] = await Promise.all([
    offerService.listOfferRequests({ status, offerId, userId, search }),
    offerService.getOfferRequestStats(),
  ]);
  res.json({ success: true, requests, stats });
});

const moderateRequest = asyncHandler(async (req, res) => {
  const result = await offerService.moderateOfferRequest(req.params.id, req.body.action, req.auth.sub);
  res.json({ success: true, ...result });
});

const bulkModerateRequests = asyncHandler(async (req, res) => {
  const result = await offerService.bulkModerateOfferRequests(req.body.requestIds, req.body.action, req.auth.sub);
  res.json({ success: true, ...result });
});

module.exports = {
  listOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  listOfferRequests,
  moderateRequest,
  bulkModerateRequests,
};
