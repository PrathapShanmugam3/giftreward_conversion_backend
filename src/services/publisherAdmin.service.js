const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { sanitize } = require('../utils/sanitize');
const { randomHex } = require('../utils/tokens');
const { sendMail } = require('./mail.service');
const { renderTemplate } = require('./emailTemplate.service');
const walletService = require('./wallet.service');
const env = require('../config/env');
const logger = require('../utils/logger');

// Mirrors sadmin/publishers.php (routes.md): admin-side publisher CRUD +
// balance/password management. Legacy inserts carried status=1 (active,
// skips email verification) since the admin is vouching for the account.
const SITE_NAME_FALLBACK = 'GiftReward';

async function getSiteName() {
  const { SiteConfig } = require('../models');
  const site = await SiteConfig.findByPk(1);
  return site?.siteName || SITE_NAME_FALLBACK;
}

function publisherSummary(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    companyName: user.companyName,
    contactNumber: user.contactNumber,
    status: user.status,
    walletBalance: user.walletBalance,
    withdrawalStatus: user.withdrawalStatus,
    postbackUrl: user.postbackUrl,
    tgChatId: user.tgChatId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// List / get
// ---------------------------------------------------------------------------
async function listPublishers({ search, page = 1, limit = 10 }) {
  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { companyName: { [Op.like]: `%${search}%` } },
    ];
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await User.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return {
    publishers: rows.map(publisherSummary),
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

async function getPublisher(id) {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.notFound('Publisher not found');
  return publisherSummary(user);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
async function createPublisher({ name, email, password, companyName, contactNumber, postbackUrl, tgChatId, withdrawalStatus }) {
  const cleanEmail = sanitize(email).toLowerCase();
  const existing = await User.findOne({ where: { email: cleanEmail } });
  if (existing) throw ApiError.conflict('Email already registered.');

  // Same htmlspecialchars-then-bcrypt transform as auth.service.js, so
  // admin-created publishers hash identically to self-registered ones.
  const rawPassword = sanitize(password);
  const hashed = await bcrypt.hash(rawPassword, 10);

  const user = await User.create({
    name: sanitize(name),
    email: cleanEmail,
    password: hashed,
    companyName: sanitize(companyName),
    contactNumber: sanitize(contactNumber),
    // [KEEP] legacy sadmin/publishers.php create_publisher inserts status=1:
    // an admin-created account is trusted, skips email verification.
    status: 1,
    walletBalance: 0,
    // Extra fields on sadmin/publishers.php's create form.
    postbackUrl: postbackUrl ? sanitize(postbackUrl) : null,
    tgChatId: tgChatId ? sanitize(tgChatId) : '',
    withdrawalStatus: withdrawalStatus === undefined ? 1 : Number(!!Number(withdrawalStatus)),
    // auth_token/tg_chat_id are NOT NULL with no default (quirks.md MySQL 8
    // strict-mode warning) — legacy inserts omit auth_token and fail under
    // strict mode; we always supply one so this works without relaxing
    // sql_mode.
    authToken: randomHex(70),
  });

  const siteName = await getSiteName();
  const html = renderTemplate('welcome_publisher', {
    subject: `Welcome to ${siteName}`,
    name: user.name,
    company_name: siteName,
    email: user.email,
    password: rawPassword,
    login_link: `${env.frontendUrl}/publisher/login`,
    year: new Date().getFullYear(),
  });

  try {
    await sendMail({ to: user.email, subject: `Welcome to ${siteName}`, html });
  } catch (err) {
    logger.error('Failed to send welcome_publisher email', { message: err.message });
  }

  return publisherSummary(user);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
const UPDATABLE_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'status', label: 'Status' },
];

async function updatePublisher(id, payload) {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.notFound('Publisher not found');

  const changes = [];
  const updates = {};

  if (payload.name !== undefined) {
    const clean = sanitize(payload.name);
    if (clean !== user.name) {
      changes.push(`Name: "${user.name}" -> "${clean}"`);
      updates.name = clean;
    }
  }

  if (payload.email !== undefined) {
    const clean = sanitize(payload.email).toLowerCase();
    if (clean !== user.email) {
      const existing = await User.findOne({ where: { email: clean, id: { [Op.ne]: id } } });
      if (existing) throw ApiError.conflict('Email already registered.');
      changes.push(`Email: "${user.email}" -> "${clean}"`);
      updates.email = clean;
    }
  }

  if (payload.companyName !== undefined) {
    const clean = sanitize(payload.companyName);
    if (clean !== user.companyName) {
      changes.push(`Company Name: "${user.companyName}" -> "${clean}"`);
      updates.companyName = clean;
    }
  }

  if (payload.contactNumber !== undefined) {
    const clean = sanitize(payload.contactNumber);
    if (clean !== user.contactNumber) {
      changes.push(`Contact Number: "${user.contactNumber}" -> "${clean}"`);
      updates.contactNumber = clean;
    }
  }

  if (payload.status !== undefined) {
    const clean = Number(payload.status);
    if (clean !== user.status) {
      changes.push(`Status: "${user.status ? 'Active' : 'Locked'}" -> "${clean ? 'Active' : 'Locked'}"`);
      updates.status = clean;
    }
  }

  // Remaining fields on the legacy edit form: per-publisher postback URL,
  // Telegram chat id, and the withdrawal on/off switch that wallet.service
  // enforces.
  if (payload.postbackUrl !== undefined) {
    const clean = payload.postbackUrl ? sanitize(payload.postbackUrl) : null;
    if (clean !== (user.postbackUrl || null)) {
      changes.push('Postback URL updated');
      updates.postbackUrl = clean;
    }
  }

  if (payload.tgChatId !== undefined) {
    const clean = sanitize(payload.tgChatId || '');
    if (clean !== user.tgChatId) {
      changes.push('Telegram chat ID updated');
      updates.tgChatId = clean;
    }
  }

  if (payload.withdrawalStatus !== undefined) {
    const clean = Number(!!Number(payload.withdrawalStatus));
    if (clean !== user.withdrawalStatus) {
      changes.push(`Withdrawals: "${user.withdrawalStatus ? 'Enabled' : 'Disabled'}" -> "${clean ? 'Enabled' : 'Disabled'}"`);
      updates.withdrawalStatus = clean;
    }
  }

  if (Object.keys(updates).length > 0) {
    await user.update(updates);
  }

  // Only notify the publisher when something actually changed, per task
  // spec — legacy always emailed on every submit even with no-op edits.
  if (changes.length > 0) {
    const siteName = await getSiteName();
    const html = renderTemplate('account_updated', {
      subject: `Your ${siteName} Account Was Updated`,
      name: user.name,
      company_name: siteName,
      changes: changes.join('\n'),
      year: new Date().getFullYear(),
    });

    try {
      await sendMail({ to: user.email, subject: `Your ${siteName} Account Was Updated`, html });
    } catch (err) {
      logger.error('Failed to send account_updated email', { message: err.message });
    }
  }

  return { publisher: publisherSummary(user), changed: changes.length > 0, changes };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
async function deletePublisher(id) {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.notFound('Publisher not found');

  const { name, email } = user;
  const siteName = await getSiteName();

  await user.destroy();

  // [FIX] quirks.md: legacy sadmin/publishers.php delete sent an
  // `account_deleted` template that didn't exist on disk, so
  // getEmailTemplate() threw AFTER the row was already deleted (delete
  // succeeded, but the admin saw an error flash). We created
  // emailTemplates/account_deleted.html so this now completes cleanly.
  const html = renderTemplate('account_deleted', {
    subject: `Your ${siteName} Account Has Been Deleted`,
    name,
    company_name: siteName,
    year: new Date().getFullYear(),
  });

  try {
    await sendMail({ to: email, subject: `Your ${siteName} Account Has Been Deleted`, html });
  } catch (err) {
    logger.error('Failed to send account_deleted email', { message: err.message });
  }

  return { message: 'Publisher deleted successfully' };
}

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------
async function resetPublisherPassword(id, newPassword) {
  const user = await User.scope('withPassword').findByPk(id);
  if (!user) throw ApiError.notFound('Publisher not found');

  const rawPassword = sanitize(newPassword);
  user.password = await bcrypt.hash(rawPassword, 10);
  // Admin-initiated reset — clear any pending self-service reset token so
  // an old forgot-password link can't race this one.
  user.resetToken = null;
  user.resetExpires = null;
  await user.save();

  const siteName = await getSiteName();
  const html = renderTemplate('password_reset', {
    subject: `Your ${siteName} Password Was Reset`,
    name: user.name,
    company_name: siteName,
    password: rawPassword,
    year: new Date().getFullYear(),
  });

  try {
    await sendMail({ to: user.email, subject: `Your ${siteName} Password Was Reset`, html });
  } catch (err) {
    logger.error('Failed to send password_reset email', { message: err.message });
  }

  return { message: 'Password reset successfully' };
}

// ---------------------------------------------------------------------------
// Adjust wallet balance (set | add)
// ---------------------------------------------------------------------------
// Mirrors sadmin/publishers.php update_balance(action=set|add, balance).
// REUSES walletService.adjustWallet for the actual mutation + ledger row
// instead of touching wallet_balance directly (task constraint) — [FIX]
// quirks.md: legacy wrote no wallet_transactions row for this path; we get
// one for free here since adjustWallet always writes the ledger.
async function adjustPublisherBalance(id, { action, amount }) {
  const amt = Number(amount);
  if (!(amt >= 0)) throw ApiError.badRequest('Amount must be a non-negative number');

  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw ApiError.notFound('Publisher not found');

    const currentBalance = Number(user.walletBalance);
    let delta;
    let reason;

    if (action === 'set') {
      delta = amt - currentBalance;
      reason = `Admin set balance to ${amt.toFixed(2)}`;
    } else if (action === 'add') {
      delta = amt;
      reason = `Admin added ${amt.toFixed(2)} to balance`;
    } else {
      throw ApiError.badRequest('Invalid action');
    }

    let updatedUser = user;
    if (delta > 0) {
      updatedUser = await walletService.adjustWallet(
        { userId: id, amount: delta, type: 'credit', reason },
        { transaction: t }
      );
    } else if (delta < 0) {
      updatedUser = await walletService.adjustWallet(
        { userId: id, amount: Math.abs(delta), type: 'debit', reason },
        { transaction: t }
      );
    }
    // delta === 0: no-op, no ledger row, no email (nothing changed).

    if (delta !== 0) {
      const siteName = await getSiteName();
      const changeLabel = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
      const html = renderTemplate('balance_update', {
        subject: `Your ${siteName} Wallet Balance Was Updated`,
        name: user.name,
        company_name: siteName,
        change: changeLabel,
        new_balance: Number(updatedUser.walletBalance).toFixed(2),
        year: new Date().getFullYear(),
      });

      try {
        await sendMail({ to: user.email, subject: `Your ${siteName} Wallet Balance Was Updated`, html });
      } catch (err) {
        logger.error('Failed to send balance_update email', { message: err.message });
      }
    }

    return { publisher: publisherSummary(updatedUser), delta };
  });
}

module.exports = {
  listPublishers,
  getPublisher,
  createPublisher,
  updatePublisher,
  deletePublisher,
  resetPublisherPassword,
  adjustPublisherBalance,
};
