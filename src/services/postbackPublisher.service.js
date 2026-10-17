const { Postback, Offer } = require('../models');
const ApiError = require('../utils/ApiError');

// Mirrors publisher/postback.php: a publisher registers their own callback
// URL for (offer, event); new submissions start 'pending' and only an
// admin-approved one actually fires (see postback.service.js's
// `status: 'approved'` filter when a conversion comes in).
async function listPostbacks(userId) {
  return Postback.findAll({
    where: { userId, status: 'approved' },
    include: [{ model: Offer, attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });
}

async function listAllOwnPostbacks(userId) {
  return Postback.findAll({
    where: { userId },
    include: [{ model: Offer, attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });
}

async function createPostback(userId, { offerId, event, postbackUrl }) {
  const offer = await Offer.findByPk(offerId);
  if (!offer) throw ApiError.badRequest('Invalid offer');

  return Postback.create({ userId, offerId, event, postbackUrl, status: 'pending' });
}

async function deletePostback(userId, id) {
  const postback = await Postback.findOne({ where: { id, userId } });
  if (!postback) throw ApiError.notFound('Postback not found');
  await postback.destroy();
  return { message: 'Postback deleted successfully' };
}

// --- Per-offer postbacks (publisher/offer.php) ---
// offer.php manages postbacks inline on the offer page and, unlike
// postback.php, inserts them as 'approved' straight away — but the page
// only shows that form when the offer access rule passes, so the same
// rule gates it here.
async function assertOfferAccess(userId, offerId) {
  const { getOfferPublisher } = require('./offer.service');
  const offer = await getOfferPublisher(offerId, userId);
  if (!offer.canAccess) throw ApiError.forbidden('You need access to this offer to manage its postbacks.');
  return offer;
}

async function listOfferPostbacks(userId, offerId) {
  return Postback.findAll({ where: { userId, offerId }, order: [['createdAt', 'DESC']] });
}

async function createOfferPostback(userId, offerId, { event, postbackUrl }) {
  await assertOfferAccess(userId, offerId);
  return Postback.create({ userId, offerId, event, postbackUrl, status: 'approved' });
}

async function updateOfferPostback(userId, offerId, id, { event, postbackUrl }) {
  const postback = await Postback.findOne({ where: { id, userId, offerId } });
  if (!postback) throw ApiError.notFound('Postback not found');
  await postback.update({ event, postbackUrl });
  return postback;
}

module.exports = {
  listPostbacks,
  listAllOwnPostbacks,
  createPostback,
  deletePostback,
  listOfferPostbacks,
  createOfferPostback,
  updateOfferPostback,
};
