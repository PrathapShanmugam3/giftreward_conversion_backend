const { sequelize, User, WalletTransaction, WithdrawalRequest, SiteConfig } = require('../models');
const ApiError = require('../utils/ApiError');

const VALID_METHODS = ['upi', 'bank', 'paypal'];

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
  if (status && status !== 'all') where.status = status;
  return WithdrawalRequest.findAll({
    where,
    include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'DESC']],
  });
}

// Mirrors sadmin/WithdrawalRequest.php update_status, but [FIX] refunds the
// balance on reject (legacy never did) and is transactional/idempotent
// (re-processing an already-resolved request is a no-op, not a second
// debit/credit).
async function updateWithdrawalStatus(withdrawalId, { status, notes }) {
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    throw ApiError.badRequest('Invalid status value');
  }

  return sequelize.transaction(async (t) => {
    const withdrawal = await WithdrawalRequest.findByPk(withdrawalId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!withdrawal) throw ApiError.notFound('Withdrawal request not found');

    if (withdrawal.status !== 'pending') {
      throw ApiError.conflict(`This request was already ${withdrawal.status} and cannot be changed`);
    }

    if (status === 'rejected') {
      await User.increment('walletBalance', { by: Number(withdrawal.amount), where: { id: withdrawal.userId }, transaction: t });
      await WalletTransaction.create(
        { userId: withdrawal.userId, amount: withdrawal.amount, type: 'credit', reason: 'Withdrawal request rejected (refund)' },
        { transaction: t }
      );
    }

    withdrawal.status = status;
    withdrawal.notes = notes || null;
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
};
