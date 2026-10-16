const { Offer, User, UserOffer, Click } = require('../models');
const ApiError = require('../utils/ApiError');
const { uniqid } = require('../utils/tokens');
const { sanitize } = require('../utils/sanitize');
const { canAccessOffer } = require('./offer.service');
const { isProxyOrVpn, getLocationFromIp } = require('./geo.service');
const { sendTelegramMessage } = require('./telegram.service');

const P_COUNT = 9;
const SUB_COUNT = 10;
const AFF_SUB_COUNT = 10;

function pickParams(query) {
  const p = {};
  for (let i = 1; i <= P_COUNT; i += 1) p[`p${i}`] = query[`p${i}`] ? sanitize(query[`p${i}`]) : '';
  const sub = {};
  for (let i = 1; i <= SUB_COUNT; i += 1) sub[`sub${i}`] = query[`sub${i}`] ? sanitize(query[`sub${i}`]) : '';
  const affSub = {};
  for (let i = 1; i <= AFF_SUB_COUNT; i += 1) affSub[`aff_sub${i}`] = query[`aff_sub${i}`] ? sanitize(query[`aff_sub${i}`]) : '';
  return { ...p, ...sub, ...affSub };
}

function buildRedirectLink(offerLink, clickId) {
  if (offerLink.includes('{tid}')) return offerLink.replace('{tid}', clickId);
  const sep = offerLink.includes('?') ? '&' : '?';
  return `${offerLink}${sep}click_id=${clickId}`;
}

async function trackClick({ query, ip, userAgent }) {
  const offerId = Number(query.cid) || 0;
  const userId = Number(query.uid) || 0;
  const params = pickParams(query);
  const googleaid = query.googleaid ? sanitize(query.googleaid) : '';
  const deviceid = query.deviceid ? sanitize(query.deviceid) : '';
  const iosidfa = query.iosidfa ? sanitize(query.iosidfa) : '';
  const source = query.source ? sanitize(query.source) : '';

  const offer = await Offer.findByPk(offerId);
  const user = await User.findByPk(userId);

  if (!offer || !user) {
    await sendTelegramMessage(
      `❌ <b>Click Tracking Error</b>\n\n📛 <b>Error:</b> Invalid offer or user\n📝 <b>Details:</b> Offer ID: ${offerId}, User ID: ${userId}\n⏰ <b>Time:</b> ${new Date().toLocaleString()}`
    );
    throw ApiError.badRequest('Invalid offer or user');
  }

  const requestRow = await UserOffer.findOne({ where: { offerId, userId } });
  const requestStatus = requestRow?.status || null;

  if (!canAccessOffer(offer.status, requestStatus)) {
    const location = await getLocationFromIp(ip);
    await sendTelegramMessage(
      `🚫 <b><u>Access Denied - Click Blocked</u></b>\n\n` +
        `📋 <b>Offer:</b> <code>${offer.name}</code>  |  <b>ID:</b> <code>${offer.id}</code>\n` +
        `👤 <b>User:</b> <code>${user.name}</code>  |  <b>ID:</b> <code>${user.id}</code>\n\n` +
        `📊 <b>Offer Status:</b> <code>${offer.status}</code>\n` +
        `📋 <b>Request Status:</b> <code>${requestStatus || 'Not Requested'}</code>\n\n` +
        `🌐 <b>IP:</b> <code>${ip}</code>\n🗺️ <b>Location:</b> <code>${location}</code>\n` +
        `🖥️ <b>UA:</b> <code>${(userAgent || '').slice(0, 50)}...</code>\n\n` +
        `⏰ <b>Time:</b> <code>${new Date().toLocaleString()}</code>\n` +
        `🔴 <b>Status:</b> <u>Access Denied - User Not Approved</u>`
    );
    throw ApiError.forbidden(
      `Access Denied. Offer: ${offer.name}. Offer Status: ${offer.status}. Your Status: ${requestStatus || 'Not Requested'}.`
    );
  }

  const clickId = uniqid();

  const blocked = await isProxyOrVpn(ip);
  if (blocked) {
    const err = ApiError.forbidden('Access Denied - VPN/Proxy Detected');
    err.isProxyBlock = true;
    const location = await getLocationFromIp(ip);
    await sendTelegramMessage(
      `🛡️ <b><u>VPN / Proxy Blocked</u></b>\n\n` +
        `📋 <b>Offer:</b> <code>${offer.name}</code>  |  <b>ID:</b> <code>${offer.id}</code>\n` +
        `👤 <b>User:</b> <code>${user.name}</code>  |  <b>ID:</b> <code>${user.id}</code>\n\n` +
        `🔗 <b>Click ID:</b> <code>${clickId}</code>\n🌐 <b>IP:</b> <code>${ip}</code>\n` +
        `🗺️ <b>Location:</b> <code>${location}</code>\n` +
        `🖥️ <b>UA:</b> <code>${(userAgent || '').slice(0, 50)}...</code>\n\n` +
        `⏰ <b>Time:</b> <code>${new Date().toLocaleString()}</code>\n` +
        `🔴 <b>Status:</b> <u>Blocked - VPN/Proxy Detected</u>`
    );
    throw err;
  }

  let dbOk = true;
  try {
    await Click.create({
      userId,
      offerId,
      clickId,
      ...params,
      googleaid,
      deviceid,
      iosidfa,
      source,
      ip,
      userAgent: userAgent || '',
    });
  } catch (err) {
    dbOk = false;
    await sendTelegramMessage(
      `❌ <b>Click Tracking Error</b>\n\n📛 <b>Error:</b> Database insertion failed\n📝 <b>Details:</b> ${err.message}\n⏰ <b>Time:</b> ${new Date().toLocaleString()}`
    );
  }

  if (dbOk) {
    const location = await getLocationFromIp(ip);
    const pParams = Object.entries(params)
      .filter(([k, v]) => k.startsWith('p') && !k.startsWith('p_') && v)
      .map(([k, v]) => `<b>${k.toUpperCase()}:</b> <code>${v}</code>`);
    await sendTelegramMessage(
      `🖱️ <b><u>New Click Tracked</u></b>\n\n` +
        `📋 <b>Offer:</b> <code>${offer.name}</code>  |  <b>ID:</b> <code>${offer.id}</code>\n` +
        `👤 <b>User:</b> <code>${user.name}</code>  |  <b>ID:</b> <code>${user.id}</code>\n\n` +
        `🔗 <b>Click ID:</b> <code>${clickId}</code>\n🌐 <b>IP:</b> <code>${ip}</code>\n` +
        `🗺️ <b>Location:</b> <code>${location}</code>\n` +
        `🖥️ <b>UA:</b> <code>${(userAgent || '').slice(0, 50)}...</code>\n\n` +
        (pParams.length ? `📊 <b>P Parameters</b>\n${pParams.join('  |  ')}\n\n` : '') +
        `⏰ <b>Time:</b> <code>${new Date().toLocaleString()}</code>\n` +
        `✅ <b>Status:</b> <u>Click Tracked Successfully</u>`
    );
  }

  const redirectLink = buildRedirectLink(offer.link, clickId);

  return { clickId, userId, redirectLink };
}

module.exports = { trackClick, buildRedirectLink };
