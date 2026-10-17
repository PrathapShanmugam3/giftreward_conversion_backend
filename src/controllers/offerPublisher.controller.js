const asyncHandler = require('../utils/asyncHandler');
const offerService = require('../services/offer.service');
const postbackService = require('../services/postbackPublisher.service');

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

const listOfferPostbacks = asyncHandler(async (req, res) => {
  const postbacks = await postbackService.listOfferPostbacks(req.auth.sub, req.params.id);
  res.json({ success: true, postbacks });
});

const createOfferPostback = asyncHandler(async (req, res) => {
  const postback = await postbackService.createOfferPostback(req.auth.sub, req.params.id, req.body);
  res.status(201).json({ success: true, message: 'Postback added successfully!', postback });
});

const updateOfferPostback = asyncHandler(async (req, res) => {
  const postback = await postbackService.updateOfferPostback(req.auth.sub, req.params.id, req.params.postbackId, req.body);
  res.json({ success: true, message: 'Postback updated successfully!', postback });
});

const deleteOfferPostback = asyncHandler(async (req, res) => {
  const result = await postbackService.deletePostback(req.auth.sub, req.params.postbackId);
  res.json({ success: true, ...result });
});

module.exports = {
  listOffers,
  getOffer,
  requestOffer,
  listOfferPostbacks,
  createOfferPostback,
  updateOfferPostback,
  deleteOfferPostback,
};
