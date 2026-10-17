const { User, SiteConfig } = require('../models');
const ApiError = require('../utils/ApiError');
const { sendMail } = require('./mail.service');

// Mirrors sadmin/custom_email_sender.php: send a custom HTML message to
// all/selected/single active publishers, with {name}/{company_name}/{year}
// template substitution. Optional attachments (in-memory buffers from the
// multipart request) go out with every recipient's copy.
async function getRecipients({ recipientType, publisherIds, singlePublisherId }) {
  if (recipientType === 'all') {
    return User.findAll({ where: { status: 1 }, attributes: ['id', 'name', 'email'] });
  }
  if (recipientType === 'selected') {
    if (!publisherIds || publisherIds.length === 0) {
      throw ApiError.badRequest('Select at least one publisher');
    }
    return User.findAll({ where: { id: publisherIds }, attributes: ['id', 'name', 'email'] });
  }
  if (recipientType === 'single') {
    if (!singlePublisherId) throw ApiError.badRequest('Select a publisher');
    const user = await User.findByPk(singlePublisherId, { attributes: ['id', 'name', 'email'] });
    return user ? [user] : [];
  }
  throw ApiError.badRequest('Invalid recipient type');
}

function personalize(message, user, siteName) {
  return message
    .replaceAll('{name}', user.name)
    .replaceAll('{company_name}', siteName)
    .replaceAll('{year}', String(new Date().getFullYear()));
}

async function sendCustomEmail({ recipientType, publisherIds, singlePublisherId, subject, message, attachments = [] }) {
  const recipients = await getRecipients({ recipientType, publisherIds, singlePublisherId });
  const config = await SiteConfig.findByPk(1);
  const siteName = config?.siteName || 'GiftReward';

  let successCount = 0;
  const errors = [];

  for (const user of recipients) {
    try {
      await sendMail({ to: user.email, subject, html: personalize(message, user, siteName), attachments });
      successCount += 1;
    } catch (err) {
      errors.push(`${user.email}: ${err.message}`);
    }
  }

  return { total: recipients.length, successCount, errorCount: errors.length, errors: errors.slice(0, 3) };
}

async function getStats() {
  const total = await User.count();
  const active = await User.count({ where: { status: 1 } });
  return { totalPublishers: total, activePublishers: active, inactivePublishers: total - active };
}

module.exports = { sendCustomEmail, getStats };
