const { Op } = require('sequelize');
const { sequelize, Conversion, User, Offer, OfferEvent } = require('../models');
const ApiError = require('../utils/ApiError');
const walletService = require('./wallet.service');

async function listConversionsAdmin({ status, offerId, userId, fromDate, toDate }) {
  const where = {};
  if (status) where.status = status;
  if (offerId) where.offerId = offerId;
  if (userId) where.userId = userId;
  // Each bound applies on its own, and the "to" day is inclusive (a bare
  // `new Date(toDate)` is midnight, which used to drop that whole day).
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt[Op.gte] = new Date(`${fromDate}T00:00:00`);
    if (toDate) where.createdAt[Op.lte] = new Date(`${toDate}T23:59:59.999`);
  }

  return Conversion.findAll({
    where,
    include: [
      { model: User, attributes: ['id', 'name', 'email'] },
      { model: Offer, attributes: ['id', 'name'] },
      { model: OfferEvent, attributes: ['id', 'eventName'] },
    ],
    order: [['createdAt', 'DESC']],
  });
}

// Mirrors sadmin/conversions.php update_status, but [FIX]: postback.php
// already inserts conversions as 'approved' and credits the wallet at that
// time, so re-"approving" an already-approved conversion here must NOT
// credit the wallet again — the legacy app had no such guard. Only a
// pending -> approved transition credits; only an approved -> rejected
// transition debits (reversing the earlier credit). Any other transition
// (already approved -> approved, already rejected -> rejected, etc.) is a
// no-op on the wallet.
async function updateConversionStatus(conversionId, newStatus, adminId) {
  if (!['pending', 'approved', 'rejected'].includes(newStatus)) {
    throw ApiError.badRequest('Invalid status value');
  }

  return sequelize.transaction(async (t) => {
    const conversion = await Conversion.findByPk(conversionId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!conversion) throw ApiError.notFound('Conversion not found');

    const previousStatus = conversion.status;
    if (previousStatus === newStatus) {
      return conversion; // no-op, nothing to credit/debit
    }

    if (previousStatus !== 'approved' && newStatus === 'approved') {
      await walletService.adjustWallet(
        { userId: conversion.userId, amount: Number(conversion.payout), type: 'credit', reason: `Conversion #${conversion.id} approved` },
        { transaction: t }
      );
    } else if (previousStatus === 'approved' && newStatus !== 'approved') {
      await walletService.adjustWallet(
        { userId: conversion.userId, amount: Number(conversion.payout), type: 'debit', reason: `Conversion #${conversion.id} ${newStatus}` },
        { transaction: t }
      );
    }

    conversion.status = newStatus;
    await conversion.save({ transaction: t });
    return conversion;
  });
}

module.exports = { listConversionsAdmin, updateConversionStatus };
