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

module.exports = { listPostbacks, listAllOwnPostbacks, createPostback, deletePostback };
