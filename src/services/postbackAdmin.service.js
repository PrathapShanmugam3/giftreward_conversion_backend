const { Op } = require('sequelize');
const { Postback, PostbackLog, Conversion, User, Offer, OfferEvent } = require('../models');
const ApiError = require('../utils/ApiError');

// ---------------------------------------------------------------------------
// Admin: publisher-submitted postback moderation
// Mirrors sadmin/approve_postback.php (list INNER JOINs offer_events on
// event name; action=approve|reject|delete|update). The legacy page has no
// bulk_action (unlike approve_ofr.php) — see routes.md — so no bulk endpoint
// is added here.
// ---------------------------------------------------------------------------
async function listPostbacksAdmin({ status, offerId, userId, search }) {
  const where = {};
  if (status) where.status = status;
  if (offerId) where.offerId = offerId;
  if (userId) where.userId = userId;

  const include = [
    { model: User, attributes: ['id', 'name', 'email'] },
    { model: Offer, attributes: ['id', 'name'] },
  ];

  if (search) {
    include[0].where = {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ],
    };
    include[0].required = false;
  }

  const postbacks = await Postback.findAll({
    where,
    include,
    order: [['createdAt', 'DESC']],
  });

  // Legacy page INNER JOINs offer_events on event name to show the matching
  // payout/cap context for each postback row; attach the same here without
  // requiring a real FK (postbacks.event is a free-text column matched
  // against offer_events.event_name, same as the postback conversion flow).
  const results = [];
  for (const pb of postbacks) {
    const json = pb.toJSON();
    const eventRow = await OfferEvent.findOne({
      where: { offerId: pb.offerId, eventName: pb.event },
      attributes: ['id', 'eventName', 'payoutAmount', 'cap'],
    });
    results.push({ ...json, offerEvent: eventRow || null });
  }
  return results;
}

async function moderatePostback(postbackId, action, fields = {}) {
  const postback = await Postback.findByPk(postbackId);
  if (!postback) throw ApiError.notFound('Postback not found');

  if (action === 'delete') {
    await postback.destroy();
    return { message: 'Postback deleted successfully' };
  }

  if (action === 'approve' || action === 'reject') {
    postback.status = action === 'approve' ? 'approved' : 'rejected';
    await postback.save();
    return { message: `Postback ${postback.status} successfully`, postback };
  }

  if (action === 'update') {
    const { event, userId, offerId, postbackUrl, status } = fields;
    if (event !== undefined) postback.event = event;
    if (userId !== undefined) postback.userId = userId;
    if (offerId !== undefined) postback.offerId = offerId;
    if (postbackUrl !== undefined) postback.postbackUrl = postbackUrl;
    if (status !== undefined) postback.status = status;
    await postback.save();
    return { message: 'Postback updated successfully', postback };
  }

  throw ApiError.badRequest('Invalid action');
}

// ---------------------------------------------------------------------------
// Admin: postbacks_log viewer — mirrors sadmin/postbacks.php (last 100 rows
// joined with conversion/publisher/offer/event info).
// ---------------------------------------------------------------------------
async function listPostbackLogs({ limit = 100 } = {}) {
  const logs = await PostbackLog.findAll({
    order: [['createdAt', 'DESC']],
    limit,
    include: [
      {
        model: Conversion,
        attributes: ['id', 'userId', 'offerId', 'eventId', 'clickId', 'status', 'payout', 'createdAt'],
        include: [
          { model: User, attributes: ['id', 'name', 'email'] },
          { model: Offer, attributes: ['id', 'name'] },
          { model: OfferEvent, attributes: ['id', 'eventName'] },
        ],
      },
    ],
  });
  return logs;
}

module.exports = { listPostbacksAdmin, moderatePostback, listPostbackLogs };
