const { Op } = require('sequelize');
const { sequelize, Offer, OfferEvent, UserOffer, Admin } = require('../models');
const ApiError = require('../utils/ApiError');

// Offer access rule, used identically across /go, /postback and the
// publisher offer pages (see SKILL.md "Critical invariants").
//   active offer + (no request OR request approved)  -> allowed
//   pending offer + request approved                  -> allowed
//   anything else                                      -> denied
function canAccessOffer(offerStatus, requestStatus) {
  if (offerStatus === 'active' && (!requestStatus || requestStatus === 'approved')) return true;
  if (offerStatus === 'pending' && requestStatus === 'approved') return true;
  return false;
}

// ---------------------------------------------------------------------------
// Admin: offer CRUD
// ---------------------------------------------------------------------------
async function listOffersAdmin({ status, page = 1, limit = 10 }) {
  const where = {};
  if (status && ['active', 'paused', 'pending'].includes(status)) where.status = status;

  const offset = (page - 1) * limit;
  const { count, rows } = await Offer.findAndCountAll({
    where,
    include: [{ model: OfferEvent }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    offers: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

async function getOfferAdmin(id, options = {}) {
  const offer = await Offer.findByPk(id, { include: [{ model: OfferEvent }], ...options });
  if (!offer) throw ApiError.notFound('Offer not found');
  return offer;
}

function validateWhitelistedIps(ipWhitelistEnabled, whitelistedIps) {
  if (!ipWhitelistEnabled || !whitelistedIps) return;
  const ips = whitelistedIps.split(',').map((ip) => ip.trim());
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  for (const ip of ips) {
    if (!ipv4.test(ip) && !ipv6.test(ip)) {
      throw ApiError.badRequest(`Invalid IP address in whitelist: ${ip}`);
    }
  }
}

function validateUrl(value, label) {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol');
  } catch {
    throw ApiError.badRequest(`Invalid ${label} URL`);
  }
}

async function createOffer(payload) {
  const {
    name,
    description,
    link,
    image,
    payoutType,
    status,
    category,
    ipWhitelistEnabled,
    whitelistedIps,
    autoApprovalEnabled,
    events, // [{ eventName, payoutAmount, cap }]
  } = payload;

  validateUrl(link, 'tracking link');
  if (image) validateUrl(image, 'image');
  validateWhitelistedIps(ipWhitelistEnabled, whitelistedIps);

  return sequelize.transaction(async (t) => {
    const offer = await Offer.create(
      {
        name,
        description,
        link,
        image,
        payoutType,
        status,
        category,
        ipWhitelistEnabled: ipWhitelistEnabled ? 1 : 0,
        whitelistedIps,
        autoApprovalEnabled: autoApprovalEnabled ? 1 : 0,
      },
      { transaction: t }
    );

    if (Array.isArray(events) && events.length > 0) {
      await OfferEvent.bulkCreate(
        events.map((e) => ({
          offerId: offer.id,
          eventName: e.eventName,
          payoutAmount: e.payoutAmount,
          cap: e.cap ?? 0,
        })),
        { transaction: t }
      );
    }

    return getOfferAdmin(offer.id, { transaction: t });
  });
}

async function updateOffer(id, payload) {
  const {
    name,
    description,
    link,
    image,
    payoutType,
    status,
    category,
    ipWhitelistEnabled,
    whitelistedIps,
    autoApprovalEnabled,
    existingEvents, // [{ id, eventName, payoutAmount, cap }]
    newEvents, // [{ eventName, payoutAmount, cap }]
  } = payload;

  validateUrl(link, 'tracking link');
  if (image) validateUrl(image, 'image');
  validateWhitelistedIps(ipWhitelistEnabled, whitelistedIps);

  return sequelize.transaction(async (t) => {
    const offer = await Offer.findByPk(id, { transaction: t });
    if (!offer) throw ApiError.notFound('Offer not found');

    await offer.update(
      {
        name,
        description,
        link,
        image,
        payoutType,
        status,
        category,
        ipWhitelistEnabled: ipWhitelistEnabled ? 1 : 0,
        whitelistedIps,
        autoApprovalEnabled: autoApprovalEnabled ? 1 : 0,
      },
      { transaction: t }
    );

    const currentEvents = await OfferEvent.findAll({ where: { offerId: id }, transaction: t });
    const currentIds = currentEvents.map((e) => e.id);
    const keptIds = [];

    if (Array.isArray(existingEvents)) {
      for (const e of existingEvents) {
        await OfferEvent.update(
          { eventName: e.eventName, payoutAmount: e.payoutAmount, cap: e.cap ?? 0 },
          { where: { id: e.id, offerId: id }, transaction: t }
        );
        keptIds.push(e.id);
      }
    }

    if (Array.isArray(newEvents) && newEvents.length > 0) {
      await OfferEvent.bulkCreate(
        newEvents
          .filter((e) => e.eventName && e.eventName.trim())
          .map((e) => ({ offerId: id, eventName: e.eventName, payoutAmount: e.payoutAmount, cap: e.cap ?? 0 })),
        { transaction: t }
      );
    }

    // Events present before the update but not re-submitted are considered
    // removed by the admin — delete them. NOTE (quirks.md): this cascades
    // and deletes any conversions tied to that event_id. Same behaviour as
    // the legacy PHP admin UI; flagged here for visibility, not silently
    // changed.
    const toDelete = currentIds.filter((cid) => !keptIds.includes(cid));
    if (toDelete.length > 0) {
      await OfferEvent.destroy({ where: { id: { [Op.in]: toDelete }, offerId: id }, transaction: t });
    }

    return getOfferAdmin(id, { transaction: t });
  });
}

async function deleteOffer(id) {
  return sequelize.transaction(async (t) => {
    const offer = await Offer.findByPk(id, { transaction: t });
    if (!offer) throw ApiError.notFound('Offer not found');
    await OfferEvent.destroy({ where: { offerId: id }, transaction: t });
    await offer.destroy({ transaction: t });
    return { message: 'Offer deleted successfully' };
  });
}

// ---------------------------------------------------------------------------
// Admin: offer access requests (users_offers)
// ---------------------------------------------------------------------------
async function listOfferRequests({ status = 'all', offerId, userId, search }) {
  const where = {};
  if (status !== 'all') where.status = status;
  if (offerId) where.offerId = offerId;
  if (userId) where.userId = userId;

  const { User: UserModel, Offer: OfferModel } = require('../models');

  const include = [
    { model: UserModel, attributes: ['id', 'name', 'email', 'companyName', 'contactNumber'] },
    { model: OfferModel, attributes: ['id', 'name', 'category', 'payoutType', 'status'] },
    { model: Admin, as: 'approver', attributes: ['id', 'username'] },
  ];

  if (search) {
    include[0].where = {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { companyName: { [Op.like]: `%${search}%` } },
      ],
    };
  }

  return UserOffer.findAll({ where, include, order: [['requestedAt', 'DESC']] });
}

async function getOfferRequestStats() {
  const [total, pending, approved, rejected] = await Promise.all([
    UserOffer.count(),
    UserOffer.count({ where: { status: 'requested' } }),
    UserOffer.count({ where: { status: 'approved' } }),
    UserOffer.count({ where: { status: 'rejected' } }),
  ]);
  return { total, pending, approved, rejected };
}

async function moderateOfferRequest(requestId, action, adminId) {
  const request = await UserOffer.findByPk(requestId);
  if (!request) throw ApiError.notFound('Request not found');

  if (action === 'delete') {
    await request.destroy();
    return { message: 'Request deleted successfully' };
  }

  if (!['approve', 'reject'].includes(action)) throw ApiError.badRequest('Invalid action');

  request.status = action === 'approve' ? 'approved' : 'rejected';
  request.approvedAt = new Date();
  request.approvedBy = adminId;
  await request.save();

  return { message: `Request ${request.status} successfully` };
}

async function bulkModerateOfferRequests(requestIds, action, adminId) {
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw ApiError.badRequest('No requests selected');
  }

  if (action === 'delete_selected') {
    await UserOffer.destroy({ where: { id: { [Op.in]: requestIds } } });
    return { message: `${requestIds.length} requests deleted successfully` };
  }

  const status = action === 'approve_selected' ? 'approved' : action === 'reject_selected' ? 'rejected' : null;
  if (!status) throw ApiError.badRequest('Invalid bulk action');

  await UserOffer.update(
    { status, approvedAt: new Date(), approvedBy: adminId },
    { where: { id: { [Op.in]: requestIds } } }
  );
  return { message: `${requestIds.length} requests ${status} successfully` };
}

// ---------------------------------------------------------------------------
// Publisher: browse + request offers
// ---------------------------------------------------------------------------
async function listOffersPublisher({ userId, category, payoutType, search }) {
  const { User: UserModel } = require('../models');
  const where = { status: { [Op.in]: ['active', 'pending'] } };
  if (category) where.category = category;
  if (payoutType) where.payoutType = payoutType;
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  const offers = await Offer.findAll({
    where,
    include: [
      { model: OfferEvent, attributes: ['id', 'eventName', 'payoutAmount', 'cap'] },
      {
        model: UserOffer,
        required: false,
        where: { userId },
        attributes: ['status'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return offers.map((offer) => {
    const json = offer.toJSON();
    const requestStatus = json.UserOffers?.[0]?.status || null;
    delete json.UserOffers;
    return {
      ...json,
      requestStatus,
      canAccess: canAccessOffer(json.status, requestStatus),
      totalPayout: json.OfferEvents.reduce((sum, e) => sum + Number(e.payoutAmount), 0),
    };
  });
}

async function getOfferPublisher(offerId, userId) {
  const { User: UserModel } = require('../models');
  const offer = await Offer.findOne({
    where: { id: offerId },
    include: [
      { model: OfferEvent },
      { model: UserOffer, required: false, where: { userId }, attributes: ['status'] },
    ],
  });
  if (!offer) throw ApiError.notFound('Offer not found');

  const json = offer.toJSON();
  const requestStatus = json.UserOffers?.[0]?.status || null;
  delete json.UserOffers;

  return {
    ...json,
    requestStatus,
    canAccess: canAccessOffer(json.status, requestStatus),
  };
}

async function requestOfferAccess(offerId, userId) {
  const offer = await Offer.findByPk(offerId);
  if (!offer) throw ApiError.notFound('Offer not found');

  const existing = await UserOffer.findOne({ where: { offerId, userId } });
  if (existing) {
    throw ApiError.conflict('You have already requested this offer.');
  }

  const status = offer.autoApprovalEnabled ? 'approved' : 'requested';
  await UserOffer.create({
    offerId,
    userId,
    status,
    approvedAt: status === 'approved' ? new Date() : null,
  });

  return {
    message:
      status === 'approved'
        ? 'Offer approved automatically! You can now start promoting.'
        : 'Offer request submitted successfully! Waiting for approval.',
    status,
  };
}

module.exports = {
  canAccessOffer,
  listOffersAdmin,
  getOfferAdmin,
  createOffer,
  updateOffer,
  deleteOffer,
  listOfferRequests,
  getOfferRequestStats,
  moderateOfferRequest,
  bulkModerateOfferRequests,
  listOffersPublisher,
  getOfferPublisher,
  requestOfferAccess,
};
