const axios = require('axios');
const { Op } = require('sequelize');
const { sequelize, User, WalletTransaction, WithdrawalRequest, Payout, SiteConfig, PaymentGateway, GatewayConfig, GatewayParameter } = require('../models');
const ApiError = require('../utils/ApiError');

const VALID_METHODS = ['bank'];

// Credits or debits a user's wallet_balance and writes a matching
// wallet_transactions row in the same DB transaction, so the ledger always
// reconciles with the balance. FIX (quirks.md): the legacy app wrote no
// transaction row for postback credits or admin balance edits, and used no
// DB transaction/lock around withdrawal debit — both fixed here.
async function adjustWallet({ userId, amount, type, reason }, options = {}) {
  const t = options.transaction;
  if (amount <= 0) throw ApiError.badRequest('Amount must be greater than 0');

  const user = await User.findByPk(userId, { transaction: t, lock: t ? t.LOCK.UPDATE : undefined });
  if (!user) throw ApiError.notFound('User not found');

  if (type === 'debit' && Number(user.walletBalance) < amount) {
    throw ApiError.badRequest("You don't have enough balance");
  }

  const delta = type === 'credit' ? amount : -amount;
  await User.increment('walletBalance', { by: delta, where: { id: userId }, transaction: t });
  await WalletTransaction.create({ userId, amount, type, reason }, { transaction: t });

  return User.findByPk(userId, { transaction: t });
}

async function getWalletOverview(userId) {
  const user = await User.findByPk(userId, { attributes: ['walletBalance', 'withdrawalStatus'] });
  if (!user) throw ApiError.notFound('User not found');

  const [transactions, withdrawals, site] = await Promise.all([
    WalletTransaction.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 10 }),
    WithdrawalRequest.findAll({ where: { userId }, order: [['createdAt', 'DESC']] }),
    SiteConfig.findByPk(1, { attributes: ['minimumWithdrawal', 'wstatus'] }),
  ]);

  return {
    walletBalance: user.walletBalance,
    withdrawalStatus: user.withdrawalStatus,
    // Same rules requestWithdrawal enforces, exposed so the page can explain
    // them up front instead of only after a rejected submit.
    minimumWithdrawal: Number(site?.minimumWithdrawal || 0),
    withdrawalsEnabled: site?.wstatus !== '0',
    transactions,
    withdrawals,
  };
}

// Mirrors publisher/wallet.php POST request_withdrawal, but transactional
// (row-locked) to prevent a double-submit race from overdrawing the
// balance, and enforces users.withdrawal_status / site_config.wstatus,
// which the legacy code loaded but never checked. [FIX] per quirks.md.
async function requestWithdrawal(userId, { amount, method, details }) {
  const amt = Number(amount);
  if (!(amt > 0)) throw ApiError.badRequest('Amount must be greater than 0');
  if (!VALID_METHODS.includes(method)) throw ApiError.badRequest('Invalid withdrawal method');
  if (!details || !String(details).trim()) throw ApiError.badRequest('Withdrawal details are required');

  return sequelize.transaction(async (t) => {
    const site = await SiteConfig.findByPk(1, { transaction: t });
    const minWithdrawal = Number(site?.minimumWithdrawal || 0);
    const withdrawalsGloballyEnabled = site?.wstatus !== '0';

    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw ApiError.notFound('User not found');

    if (!withdrawalsGloballyEnabled) {
      throw ApiError.forbidden('Withdrawals are currently disabled by the site administrator');
    }
    if (!user.withdrawalStatus) {
      throw ApiError.forbidden('Withdrawals are disabled for your account');
    }
    if (amt < minWithdrawal) {
      throw ApiError.badRequest(`Minimum withdrawal amount is ₹${minWithdrawal}`);
    }
    if (amt > Number(user.walletBalance)) {
      throw ApiError.badRequest("You don't have enough balance");
    }

    await User.decrement('walletBalance', { by: amt, where: { id: userId }, transaction: t });
    await WalletTransaction.create(
      { userId, amount: amt, type: 'debit', reason: 'Withdrawal request' },
      { transaction: t }
    );
    const withdrawal = await WithdrawalRequest.create(
      { userId, amount: amt, method, details, status: 'pending' },
      { transaction: t }
    );

    return withdrawal;
  });
}

async function getInvoice(userId, withdrawalId) {
  const withdrawal = await WithdrawalRequest.findOne({ where: { id: withdrawalId, userId } });
  if (!withdrawal) throw ApiError.notFound('Withdrawal request not found');
  const user = await User.findByPk(userId, { attributes: ['name', 'email', 'companyName'] });
  return { withdrawal, user };
}

// ---------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------
async function listWithdrawalsAdmin({ status } = {}) {
  const where = {};
  if (status === 'pending') where.status = { [Op.in]: ['pending', 'approved'] };
  else if (status && status !== 'all') where.status = status;
  return WithdrawalRequest.findAll({
    where,
    include: [
      { model: User, attributes: ['id', 'name', 'email'] },
      {
        model: Payout,
        attributes: ['id', 'rupiyaxTrxId', 'refId', 'amount', 'fee', 'status', 'utr', 'createdAt'],
        include: [{ model: PaymentGateway, attributes: ['id', 'name'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
}

// Mirrors sadmin/WithdrawalRequest.php update_status, but [FIX] refunds the
// balance on reject (legacy never did) and is transactional/idempotent
// (re-processing an already-resolved request is a no-op, not a second
// debit/credit).
async function sendGatewayPayout(withdrawal, gatewayId, transaction) {
  if (!gatewayId) return null; // Manual payout: admin has paid outside the system.
  const gateway = await PaymentGateway.findOne({
    where: { id: gatewayId, type: 'api', status: 'active' },
    include: [{ model: GatewayConfig }, { model: GatewayParameter }],
    transaction,
  });
  if (!gateway) {
    throw ApiError.badRequest('Choose an active API gateway, or leave gateway blank for a manual payout');
  }

  const config = gateway.GatewayConfig;
  if (gateway.name.trim().toLowerCase() === 'rupiyax') {
    const user = await User.findByPk(withdrawal.userId, { attributes: ['name'], transaction });
    return sendRupiyaXPayout(withdrawal, config?.apiKey, user?.name);
  }
  if (!config?.apiEndpoint) {
    throw ApiError.badRequest('This API gateway needs an endpoint, or leave gateway blank for a manual payout');
  }
  const payload = {};
  for (const parameter of gateway.GatewayParameters || []) {
    payload[parameter.paramKey] = parameter.paramValue;
  }
  Object.assign(payload, {
    withdrawalId: withdrawal.id,
    amount: Number(withdrawal.amount),
    currency: 'INR',
    method: withdrawal.method,
    beneficiary: withdrawal.details,
    idempotencyKey: `withdrawal-${withdrawal.id}`,
  });
  const headers = { Accept: 'application/json', 'Idempotency-Key': payload.idempotencyKey };
  if (config.apiKey) headers['X-API-Key'] = config.apiKey;
  if (config.apiSecret) headers['X-API-Secret'] = config.apiSecret;

  let response;
  try {
    response = await axios({
      url: config.apiEndpoint,
      method: config.apiMethod || 'POST',
      headers,
      timeout: 20000,
      ...(config.apiMethod === 'GET' ? { params: payload } : { data: payload }),
      validateStatus: () => true,
    });
  } catch (err) {
    throw new ApiError(502, `Payout gateway request failed: ${err.code === 'ECONNABORTED' ? 'request timed out' : 'could not connect'}. Check the gateway before retrying.`);
  }
  const successCodes = String(config.successCodes || '200,201').split(',').map((code) => Number(code.trim()));
  if (!successCodes.includes(response.status)) {
    throw new ApiError(502, `Payout gateway returned HTTP ${response.status}; withdrawal remains pending`);
  }
  return response.data;
}

// RupiRewards uses this provider's dedicated payout contract. Keep this
// adapter aligned with backend/services/rupiyaXService.js in that project.
async function sendRupiyaXPayout(withdrawal, apiKey, userName) {
  if (!apiKey?.trim()) throw ApiError.badRequest('Add the RupiyaX API key to this gateway first');
  const payoutMethod = String(withdrawal.method).toLowerCase();
  if (!['upi', 'bank'].includes(payoutMethod)) {
    throw ApiError.badRequest('RupiyaX payouts support UPI and bank transfer only');
  }
  const fields = {};
  const details = String(withdrawal.details || '').trim();
  if (details.includes(':')) {
    details.split(/[|\n]/).forEach((part) => {
      const i = part.indexOf(':');
      if (i < 0) return;
      const key = part.slice(0, i).trim().toLowerCase();
      const value = part.slice(i + 1).trim();
      if (!value) return;
      if (key.startsWith('name') || key.includes('holder')) fields.name = value;
      else if (key.startsWith('a/c') || key.includes('account')) fields.accountNumber = value;
      else if (key.includes('ifsc')) fields.ifsc = value;
      else if (key.includes('upi')) fields.upi = value;
    });
  }

  const isUpi = payoutMethod === 'upi';
  const upi = isUpi ? (fields.upi || details) : '';
  const accountNumber = isUpi ? '' : (fields.accountNumber || '');
  const ifsc = isUpi ? '' : (fields.ifsc || '');
  if ((isUpi && !upi) || (!isUpi && (!accountNumber || !ifsc))) {
    throw ApiError.badRequest(isUpi
      ? 'Enter a valid UPI ID for RupiyaX payouts'
      : 'For RupiyaX bank payouts, enter details as Account Number: … | IFSC: … | Account Holder: …');
  }

  let result;
  try {
    const response = await axios.post('https://api.rupiyax.com/api/v1/payouts/request', {
      amount: Number(withdrawal.amount),
      ref_id: `WD${withdrawal.id}`,
      comment: '',
      method: isUpi ? 'upi' : 'imps',
      name: fields.name || userName || 'Unknown',
      upi,
      acc_no: accountNumber,
      ifsc,
    }, {
      headers: { 'x-api-key': apiKey.trim(), 'Content-Type': 'application/json' },
      timeout: 20000,
    });
    result = response.data;
  } catch (err) {
    if (err.response?.data?.message) {
      throw new ApiError(502, `RupiyaX payout failed: ${err.response.data.message}`);
    }
    throw new ApiError(502, `RupiyaX payout request failed${err.code === 'ECONNABORTED' ? ' (timed out)' : ''}; check RupiyaX before retrying.`);
  }
  if (!result?.success) {
    throw new ApiError(502, `RupiyaX rejected the payout: ${result?.message || 'unknown provider error'}`);
  }
  return result;
}

function gatewayReference(response, keyA, keyB) {
  return response?.data?.[keyA] || response?.data?.[keyB] || null;
}

async function refreshWithdrawalGatewayStatus(withdrawalId) {
  const payout = await Payout.findOne({
    where: { withdrawalId },
    include: [{ model: PaymentGateway, include: [{ model: GatewayConfig }] }],
    order: [['createdAt', 'DESC']],
  });
  if (!payout || (!payout.rupiyaxTrxId && !payout.refId)) {
    throw ApiError.notFound('No RupiyaX payout found for this withdrawal yet');
  }
  if (payout.PaymentGateway?.name?.trim().toLowerCase() !== 'rupiyax') {
    throw ApiError.badRequest('Live settlement refresh is available for RupiyaX payouts only');
  }

  let gateway;
  try {
    const query = payout.rupiyaxTrxId
      ? `trx_id=${encodeURIComponent(payout.rupiyaxTrxId)}`
      : `ref_id=${encodeURIComponent(payout.refId)}`;
    const { data } = await axios.get(`https://api.rupiyax.com/api/v1/payouts/status?${query}`, {
      headers: { 'x-api-key': String(payout.PaymentGateway?.GatewayConfig?.apiKey || '').trim() },
      timeout: 20000,
    });
    gateway = data;
  } catch (err) {
    throw new ApiError(502, `Could not refresh RupiyaX status: ${err.response?.data?.message || err.message}`);
  }

  const gatewayStatus = String(gateway?.data?.status || '').toLowerCase();
  const updatedWithdrawal = await sequelize.transaction(async (t) => {
    const withdrawal = await WithdrawalRequest.findByPk(withdrawalId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!withdrawal) throw ApiError.notFound('Withdrawal request not found');
    payout.status = gatewayStatus || payout.status;
    payout.utr = gateway?.data?.utr || payout.utr;
    payout.rawResponse = gateway || {};
    await payout.save({ transaction: t });
    withdrawal.gatewayStatus = gatewayStatus || withdrawal.gatewayStatus;
    if (gatewayStatus === 'success' && withdrawal.status !== 'rejected') {
      withdrawal.status = 'paid';
      withdrawal.paidAt = new Date();
    } else if (gatewayStatus === 'failed' && !['rejected', 'paid'].includes(withdrawal.status)) {
      withdrawal.status = 'failed';
      if (!withdrawal.refundedAt) {
        await User.increment('walletBalance', { by: Number(withdrawal.amount), where: { id: withdrawal.userId }, transaction: t });
        await WalletTransaction.create({ userId: withdrawal.userId, amount: withdrawal.amount, type: 'credit', reason: `Withdrawal #${withdrawal.id} payout failed (refund)` }, { transaction: t });
        withdrawal.refundedAt = new Date();
      }
    }
    await withdrawal.save({ transaction: t });
    return withdrawal;
  });
  return { gateway, withdrawal: updatedWithdrawal };
}

async function markWithdrawalPaidManually(withdrawalId) {
  return sequelize.transaction(async (t) => {
    const withdrawal = await WithdrawalRequest.findByPk(withdrawalId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!withdrawal || withdrawal.status !== 'approved') {
      throw ApiError.badRequest('Withdrawal not found or not in approved state');
    }
    const payout = await Payout.findOne({
      where: { withdrawalId },
      include: [{ model: PaymentGateway, attributes: ['name'] }],
      transaction: t,
    });
    if (payout?.PaymentGateway?.name?.trim().toLowerCase() === 'rupiyax') {
      throw ApiError.badRequest('A RupiyaX payout is recorded; refresh its live status instead');
    }
    withdrawal.status = 'paid';
    withdrawal.gatewayStatus = 'manual';
    withdrawal.paidAt = new Date();
    await withdrawal.save({ transaction: t });
    return withdrawal;
  });
}

async function updateWithdrawalStatus(withdrawalId, { status, notes, gatewayId }) {
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    throw ApiError.badRequest('Invalid status value');
  }

  return sequelize.transaction(async (t) => {
    const withdrawal = await WithdrawalRequest.findByPk(withdrawalId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!withdrawal) throw ApiError.notFound('Withdrawal request not found');

    if (withdrawal.status !== 'pending') {
      throw ApiError.conflict(`This request was already ${withdrawal.status} and cannot be changed`);
    }

    // Keep the row lock while contacting the provider so concurrent admin
    // clicks cannot submit the same withdrawal twice. Provider receives a
    // stable idempotency key for safe retries after ambiguous network errors.
    const gatewayResponse = status === 'approved'
      ? await sendGatewayPayout(withdrawal, gatewayId, t)
      : null;

    if (status === 'rejected') {
      await User.increment('walletBalance', { by: Number(withdrawal.amount), where: { id: withdrawal.userId }, transaction: t });
      await WalletTransaction.create(
        { userId: withdrawal.userId, amount: withdrawal.amount, type: 'credit', reason: 'Withdrawal request rejected (refund)' },
        { transaction: t }
      );
    }

    const manualPaid = status === 'approved' && !gatewayId;
    withdrawal.status = manualPaid ? 'paid' : status;
    const providerReference = gatewayResponse?.transferId || gatewayResponse?.referenceId || gatewayResponse?.id
      || gatewayResponse?.data?.trxId || gatewayResponse?.data?.trx_id || gatewayResponse?.data?.refId || gatewayResponse?.data?.ref_id;
    withdrawal.notes = [notes, providerReference ? `Gateway reference: ${providerReference}` : null].filter(Boolean).join('\n') || null;
    if (manualPaid) {
      withdrawal.gatewayStatus = 'manual';
      withdrawal.paidAt = new Date();
    } else if (gatewayResponse) {
      const gatewayStatus = String(gatewayResponse?.data?.status || (gatewayResponse?.success ? 'pending' : 'failed')).toLowerCase();
      withdrawal.gatewayStatus = gatewayStatus;
      await Payout.create({
        withdrawalId: withdrawal.id,
        gatewayId: gatewayId || null,
        rupiyaxTrxId: gatewayReference(gatewayResponse, 'trxId', 'trx_id'),
        refId: gatewayReference(gatewayResponse, 'refId', 'ref_id') || `WD${withdrawal.id}`,
        amount: withdrawal.amount,
        fee: gatewayResponse?.data?.fee || null,
        status: gatewayStatus,
        utr: gatewayResponse?.data?.utr || null,
        rawResponse: gatewayResponse,
      }, { transaction: t });
      if (gatewayStatus === 'success') {
        withdrawal.status = 'paid';
        withdrawal.paidAt = new Date();
      }
    }
    withdrawal.processedAt = new Date();
    await withdrawal.save({ transaction: t });

    return withdrawal;
  });
}

module.exports = {
  adjustWallet,
  getWalletOverview,
  requestWithdrawal,
  getInvoice,
  listWithdrawalsAdmin,
  updateWithdrawalStatus,
  refreshWithdrawalGatewayStatus,
  markWithdrawalPaidManually,
};
