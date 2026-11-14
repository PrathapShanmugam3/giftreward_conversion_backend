const axios = require('axios');
const { Op } = require('sequelize');
const {
  sequelize, CampaignCashbackPayout, Click, Conversion, OfferEvent, Campaign, CampaignClick, ReferUser,
  PaymentGateway, GatewayConfig,
} = require('../models');
const ApiError = require('../utils/ApiError');

function bankFields(details = '') {
  const text = String(details);
  return {
    accountNumber: text.match(/account number:\s*([0-9]{6,20})/i)?.[1] || '',
    ifsc: text.match(/ifsc:\s*([A-Z0-9]{11})/i)?.[1]?.toUpperCase() || '',
    name: text.match(/account holder:\s*([^|]+)/i)?.[1]?.trim() || '',
  };
}

function campaignEventConfig(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

function amountFor(config, eventName, field) {
  const event = Object.entries(config).find(([name]) => name.toLowerCase() === String(eventName).toLowerCase())?.[1];
  const amount = Number(event?.[field] || 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

async function queueApprovedConversion(conversion, transaction) {
  const [click, event, campaign] = await Promise.all([
    Click.findOne({ where: { clickId: conversion.clickId }, transaction }),
    OfferEvent.findByPk(conversion.eventId, { transaction }),
    Campaign.findOne({ where: { offerId: conversion.offerId, userId: conversion.userId }, transaction, order: [['createdAt', 'DESC']] }),
  ]);
  if (!click || !event || !campaign) return [];

  const campaignClick = await CampaignClick.findOne({
    where: { offerid: String(conversion.offerId), user: String(conversion.userId), number: click.sub1 || '' },
    order: [['id', 'DESC']],
    transaction,
  });
  if (!campaignClick) return [];

  const config = campaignEventConfig(campaign.eventConfig);
  const userBank = bankFields(campaignClick.upi);
  const created = [];
  const userAmount = amountFor(config, event.eventName, 'user_cashback');
  if (userAmount && userBank.accountNumber && userBank.ifsc && click.p1 === userBank.accountNumber) {
    const [row] = await CampaignCashbackPayout.findOrCreate({
      where: { conversionId: conversion.id, recipientType: 'user' },
      defaults: {
        conversionId: conversion.id, recipientType: 'user', recipientName: userBank.name || campaignClick.name,
        accountNumber: userBank.accountNumber, ifsc: userBank.ifsc, amount: userAmount, status: 'pending',
      },
      transaction,
    });
    created.push(row);
  }

  const refer = campaignClick.refercode
    ? await ReferUser.findOne({ where: { campaignId: campaign.campaignId, referCode: campaignClick.refercode }, transaction })
    : null;
  const refBank = bankFields(refer?.upiId);
  const refAmount = amountFor(config, event.eventName, 'referral_cashback');
  if (refer && refAmount && click.p2 === refBank.accountNumber && refBank.accountNumber && refBank.ifsc) {
    const [row] = await CampaignCashbackPayout.findOrCreate({
      where: { conversionId: conversion.id, recipientType: 'referrer' },
      defaults: {
        conversionId: conversion.id, recipientType: 'referrer', recipientName: refBank.name,
        accountNumber: refBank.accountNumber, ifsc: refBank.ifsc, amount: refAmount, status: 'pending',
      },
      transaction,
    });
    created.push(row);
  }
  return created;
}

async function listPayouts({ status } = {}) {
  const where = {};
  if (status && status !== 'all') {
    where.status = status === 'pending' ? { [Op.in]: ['pending', 'processing'] } : status;
  }
  return CampaignCashbackPayout.findAll({ where, order: [['createdAt', 'DESC']] });
}

async function rupiyaXGateway(gatewayId) {
  const gateway = await PaymentGateway.findOne({
    where: { id: gatewayId, type: 'api', status: 'active' },
    include: [{ model: GatewayConfig }],
  });
  if (!gateway || gateway.name.trim().toLowerCase() !== 'rupiyax' || !gateway.GatewayConfig?.apiKey?.trim()) {
    throw ApiError.badRequest('Select an active RupiyaX gateway with an API key');
  }
  return gateway;
}

async function requestRupiyaXPayout(row, gateway) {
  const refId = row.refId || `CBP${row.id}`;
  try {
    const { data } = await axios.post('https://api.rupiyax.com/api/v1/payouts/request', {
      amount: Number(row.amount),
      ref_id: String(refId),
      comment: `Cashback conversion ${row.conversionId} (${row.recipientType})`,
      method: 'imps',
      name: String(row.recipientName || 'Offer user'),
      upi: '',
      acc_no: String(row.accountNumber),
      ifsc: String(row.ifsc),
    }, {
      headers: { 'x-api-key': gateway.GatewayConfig.apiKey.trim(), 'Content-Type': 'application/json' },
      timeout: 20000,
    });
    return data;
  } catch (err) {
    throw new ApiError(502, `RupiyaX cashback payout failed: ${err.response?.data?.message || err.message}`);
  }
}

async function payPayout(payoutId, gatewayId) {
  const payout = await CampaignCashbackPayout.findByPk(payoutId);
  if (!payout) throw ApiError.notFound('Cashback payout not found');
  if (!['pending', 'failed'].includes(payout.status)) throw ApiError.conflict(`Payout is already ${payout.status}`);
  const gateway = await rupiyaXGateway(gatewayId);
  const response = await requestRupiyaXPayout(payout, gateway);
  if (!response?.success) throw new ApiError(502, `RupiyaX rejected the payout: ${response?.message || 'unknown provider error'}`);

  const providerStatus = String(response?.data?.status || 'pending').toLowerCase();
  payout.gatewayId = gateway.id;
  payout.gatewayStatus = providerStatus;
  payout.status = providerStatus === 'success' ? 'paid' : 'processing';
  payout.refId = response?.data?.refId || response?.data?.ref_id || payout.refId || `CBP${payout.id}`;
  payout.rupiyaxTrxId = response?.data?.trxId || response?.data?.trx_id || null;
  payout.utr = response?.data?.utr || null;
  payout.paidAt = providerStatus === 'success' ? new Date() : null;
  payout.rawResponse = response;
  await payout.save();
  return payout;
}

async function refreshPayoutStatus(payoutId) {
  const payout = await CampaignCashbackPayout.findByPk(payoutId, { include: [{ model: PaymentGateway, include: [{ model: GatewayConfig }] }] });
  if (!payout) throw ApiError.notFound('Cashback payout not found');
  if (payout.PaymentGateway?.name?.trim().toLowerCase() !== 'rupiyax') throw ApiError.badRequest('This payout has no RupiyaX transaction');
  const query = payout.rupiyaxTrxId
    ? `trx_id=${encodeURIComponent(payout.rupiyaxTrxId)}`
    : `ref_id=${encodeURIComponent(payout.refId || `CBP${payout.id}`)}`;
  let response;
  try {
    ({ data: response } = await axios.get(`https://api.rupiyax.com/api/v1/payouts/status?${query}`, {
      headers: { 'x-api-key': payout.PaymentGateway.GatewayConfig.apiKey.trim() }, timeout: 20000,
    }));
  } catch (err) {
    throw new ApiError(502, `Could not refresh RupiyaX status: ${err.response?.data?.message || err.message}`);
  }
  const state = String(response?.data?.status || '').toLowerCase();
  if (state) {
    payout.gatewayStatus = state;
    payout.status = state === 'success' ? 'paid' : state === 'failed' ? 'failed' : 'processing';
    payout.utr = response?.data?.utr || payout.utr;
    payout.paidAt = state === 'success' ? new Date() : payout.paidAt;
    payout.rawResponse = response;
    await payout.save();
  }
  return { payout, gateway: response };
}

module.exports = { queueApprovedConversion, listPayouts, payPayout, refreshPayoutStatus };
