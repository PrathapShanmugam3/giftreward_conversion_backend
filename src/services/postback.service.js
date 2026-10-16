const axios = require('axios');
const { sequelize, Click, User, Offer, UserOffer, OfferEvent, Conversion, Admin, Postback, PostbackLog, IpPageWhitelist, WalletTransaction } = require('../models');
const ApiError = require('../utils/ApiError');
const { canAccessOffer } = require('./offer.service');
const { getIpLocation } = require('./geo.service');
const { sendTelegramMessage } = require('./telegram.service');
const logger = require('../utils/logger');

const CLICK_ID_RE = /^[a-zA-Z0-9_-]+$/;

function formatTimeDifference(t1, t2) {
  const diffMs = Math.abs(new Date(t2).getTime() - new Date(t1).getTime());
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  const s = Math.floor((diffMs % 60000) / 1000);
  const parts = [];
  if (h > 0) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
  if (s > 0) parts.push(`${s} second${s > 1 ? 's' : ''}`);
  return parts.length ? parts.join(' ') : '0 seconds';
}

async function sendRejectedMessage(click, event, reason, { totalLeads = 0, todayLeads = 0, advertiserIp } = {}) {
  const clickTime = click?.createdAt || new Date();
  const now = new Date();
  const location = await getIpLocation(click?.ip);
  const params = [];
  for (let i = 1; i <= 9; i += 1) if (click?.[`p${i}`]) params.push(`<b>P${i}:</b> ${click[`p${i}`]}`);
  for (let i = 1; i <= 3; i += 1) if (click?.[`sub${i}`]) params.push(`<b>Sub${i}:</b> ${click[`sub${i}`]}`);
  for (let i = 1; i <= 2; i += 1) if (click?.[`aff_sub${i}`]) params.push(`<b>AffSub${i}:</b> ${click[`aff_sub${i}`]}`);

  let msg = `⚠ <b>${click?.offerName || 'Unknown Offer'} Rejected Conversion Alert</b> ⚠\n\n`;
  msg += `♻️ <b>Offer ID:</b> ${click?.offerId ?? 'N/A'} | <b>Event:</b> ${event}\n`;
  msg += `🆔 <b>Click ID:</b> ${click?.clickId ?? 'N/A'}\n\n`;
  msg += `📣 <b>Affiliate:</b> ${click?.userName ?? 'N/A'} [ID: ${click?.userId ?? 'N/A'}]\n`;
  const advertiserIps = click?.ipWhitelistEnabled && click?.whitelistedIps ? click.whitelistedIps : 'All IPs Allowed';
  msg += `♻️ <b>Advertisers:</b> ${advertiserIps}\n\n`;
  msg += params.length ? `🎯 <b>Parameters:</b>\n${params.join(' | ')}\n\n` : `🎯 <b>Parameters:</b> No parameters found\n\n`;
  msg += `🌐 <b>Advertiser IP:</b> ${advertiserIp ?? 'N/A'}\n🌐 <b>User IP:</b> ${click?.ip ?? 'N/A'}\n📍 <b>Location:</b> ${location}\n\n`;
  if (totalLeads > 0 || todayLeads > 0) {
    msg += `⭐️ <b>Offer Total Leads:</b> ${totalLeads} [ Today: ${todayLeads} ]\n\n`;
  }
  msg += `⏰ <b>Click Time:</b> ${new Date(clickTime).toLocaleString()}\n`;
  msg += `⏰ <b>Track Time:</b> ${now.toLocaleString()}\n`;
  msg += `⏰️ <b>Time Gap:</b> ${formatTimeDifference(clickTime, now)}\n\n`;
  msg += `🤔 <b>Reason:</b> ${reason}\n\n⚡️ <b>Powered By:</b> GiftReward\n\n`;
  return sendTelegramMessage(msg);
}

async function sendSuccessMessage(click, eventData, event, conversionId, totalLeads, todayLeads, advertiserIp) {
  const clickTime = click.createdAt;
  const now = new Date();
  const location = await getIpLocation(click.ip);
  const params = [];
  for (let i = 1; i <= 9; i += 1) if (click[`p${i}`]) params.push(`<b>P${i}:</b> ${click[`p${i}`]}`);
  for (let i = 1; i <= 3; i += 1) if (click[`sub${i}`]) params.push(`<b>Sub${i}:</b> ${click[`sub${i}`]}`);
  for (let i = 1; i <= 2; i += 1) if (click[`aff_sub${i}`]) params.push(`<b>AffSub${i}:</b> ${click[`aff_sub${i}`]}`);

  let msg = `📥 <b>${click.offerName || 'Unknown Offer'} Conversion Alert</b> 📥\n\n`;
  msg += `♻️ <b>Offer ID:</b> ${click.offerId} | <b>Event:</b> ${event}\n`;
  msg += `🆔 <b>Click ID:</b> ${click.clickId}\n\n`;
  msg += `📣 <b>Affiliate:</b> ${click.userName} [ID: ${click.userId}]\n`;
  const advertiserIps = click.ipWhitelistEnabled && click.whitelistedIps ? click.whitelistedIps : 'All IPs Allowed';
  msg += `♻️ <b>Advertisers:</b> ${advertiserIps}\n\n`;
  if (params.length) msg += `🎯 <b>Parameters:</b>\n${params.join(' | ')}\n\n`;
  msg += `🌐 <b>Advertiser IP:</b> ${advertiserIp}\n🌐 <b>User IP:</b> ${click.ip}\n📍 <b>Location:</b> ${location}\n\n`;
  msg += `⭐️ <b>Offer Total Leads:</b> ${totalLeads + 1} [ Today: ${todayLeads + 1} ]\n\n`;
  msg += `⏰ <b>Click Time:</b> ${new Date(clickTime).toLocaleString()}\n`;
  msg += `⏰ <b>Track Time:</b> ${now.toLocaleString()}\n`;
  msg += `⏰️ <b>Time Gap:</b> ${formatTimeDifference(clickTime, now)}\n\n`;
  msg += `💰 <b>Payout:</b> $${eventData.payoutAmount}\n🆔 <b>Conversion ID:</b> ${conversionId}\n\n`;
  msg += `⚡️ <b>Powered By:</b> GiftReward\n\n`;
  return sendTelegramMessage(msg);
}

async function leadCounts(offerId, eventId) {
  const [total, today] = await Promise.all([
    Conversion.count({ where: { offerId, eventId } }),
    Conversion.count({
      where: {
        offerId,
        eventId,
        createdAt: { [require('sequelize').Op.gte]: new Date(new Date().toDateString()) },
      },
    }),
  ]);
  return { total, today };
}

function reject(statusCode, message) {
  throw new ApiError(statusCode, message);
}

// Mirrors the legacy postback.php logic exactly, including the processing order (cap is
// decremented before the duplicate/secret checks and restored on any later
// rejection) — see flows.md "Conversion postback" for the numbered steps
// this function follows 1:1.
async function processPostback({ clickId, event, key, offerId: offerIdParam, advertiserIp }) {
  if (!clickId || !event) {
    reject(400, 'ERROR: Missing parameters');
  }
  if (!CLICK_ID_RE.test(clickId)) {
    reject(400, 'ERROR: Invalid click_id format');
  }

  const ipBlock = await IpPageWhitelist.findOne({ where: { ip: advertiserIp } });
  if (ipBlock && ipBlock.status === 1) {
    reject(403, `ERROR: IP ${advertiserIp} is not whitelisted for conversion tracking`);
  }

  const clickRow = await Click.findOne({ where: { clickId } });
  if (!clickRow) {
    reject(404, `ERROR: Invalid click_id - ${clickId}`);
  }
  const user = await User.findByPk(clickRow.userId);
  const offer = await Offer.findByPk(clickRow.offerId);
  if (!user || !offer) {
    reject(404, `ERROR: Invalid click_id - ${clickId}`);
  }

  const click = {
    ...clickRow.toJSON(),
    userName: user.name,
    offerName: offer.name,
    ipWhitelistEnabled: offer.ipWhitelistEnabled,
    whitelistedIps: offer.whitelistedIps,
    offerStatus: offer.status,
  };

  const requestRow = await UserOffer.findOne({ where: { userId: click.userId, offerId: click.offerId } });
  const requestStatus = requestRow?.status || null;

  if (!canAccessOffer(offer.status, requestStatus)) {
    await sendRejectedMessage(click, event, `Access Denied - Offer Status: ${offer.status}, Request Status: ${requestStatus || 'not requested'}`, { advertiserIp });
    reject(403, 'ERROR: User does not have access to this offer.');
  }

  if (offerIdParam && String(click.offerId) !== String(offerIdParam)) {
    await sendRejectedMessage(click, event, 'Offer ID Mismatch', { advertiserIp });
    reject(400, `ERROR: Click ID ${clickId} does not match the specified offer ID ${offerIdParam}`);
  }

  if (offer.ipWhitelistEnabled === 1) {
    const allowed = (offer.whitelistedIps || '').split(',').map((s) => s.trim());
    if (!allowed.includes(advertiserIp)) {
      await sendRejectedMessage(click, event, 'IP Not Whitelisted', { advertiserIp });
      reject(403, `ERROR: IP ${advertiserIp} not whitelisted for offer ID ${click.offerId}`);
    }
  }

  const eventData = await OfferEvent.findOne({ where: { offerId: click.offerId, eventName: event } });
  if (!eventData) {
    await sendRejectedMessage(click, event, 'Event Not Found', { advertiserIp });
    reject(404, `ERROR: Event '${event}' not found for offer ID ${click.offerId}`);
  }

  if (eventData.cap === 0) {
    await sendRejectedMessage(click, event, 'Conversions Not Allowed (Cap: 0)', { advertiserIp });
    reject(403, 'ERROR: Conversions not allowed for this event (cap is 0)');
  }

  let capDecremented = false;
  if (eventData.cap > 0) {
    const [affected] = await sequelize.query(
      'UPDATE offer_events SET cap = cap - 1 WHERE id = ? AND cap > 0',
      { replacements: [eventData.id] }
    );
    if (affected === 0) {
      const { total, today } = await leadCounts(click.offerId, eventData.id);
      await sendRejectedMessage(click, event, 'Cap Reached', { totalLeads: total, todayLeads: today, advertiserIp });
      reject(403, `ERROR: Cap reached for event '${event}'`);
    }
    capDecremented = true;

    const refreshed = await OfferEvent.findByPk(eventData.id);
    if (refreshed.cap < 0) {
      await OfferEvent.increment('cap', { where: { id: eventData.id } });
      const { total, today } = await leadCounts(click.offerId, eventData.id);
      await sendRejectedMessage(click, event, 'Cap Reached', { totalLeads: total, todayLeads: today, advertiserIp });
      reject(403, `ERROR: Cap reached for event '${event}'`);
    }
  }

  async function restoreCapIfNeeded() {
    if (capDecremented) await OfferEvent.increment('cap', { where: { id: eventData.id } });
  }

  const duplicate = await Conversion.findOne({ where: { clickId, eventId: eventData.id } });
  if (duplicate) {
    await restoreCapIfNeeded();
    await sendRejectedMessage(click, event, 'Duplicate Conversion', { advertiserIp });
    reject(409, `ERROR: Conversion already exists for click ID ${clickId} and event '${event}'`);
  }

  const admin = await Admin.findByPk(1);
  if (key !== admin?.token) {
    await restoreCapIfNeeded();
    await sendRejectedMessage(click, event, 'Unauthorized Access', { advertiserIp });
    reject(403, 'Unauthorized');
  }

  const { total: totalLeads, today: todayLeads } = await leadCounts(click.offerId, eventData.id);

  let conversion;
  try {
    conversion = await Conversion.create({
      userId: click.userId,
      offerId: click.offerId,
      eventId: eventData.id,
      clickId,
      status: 'approved',
      payout: eventData.payoutAmount,
    });
  } catch (err) {
    await restoreCapIfNeeded();
    await sendRejectedMessage(click, event, `Database Error: ${err.message}`, { advertiserIp });
    reject(500, `ERROR: Inserting conversion failed - ${err.message}`);
  }

  try {
    await User.increment('walletBalance', { by: Number(eventData.payoutAmount), where: { id: click.userId } });
    // [FIX] (quirks.md): legacy credited the wallet here without writing a
    // wallet_transactions row, leaving no ledger trail for this credit.
    await WalletTransaction.create({
      userId: click.userId,
      amount: eventData.payoutAmount,
      type: 'credit',
      reason: `Conversion #${conversion.id} payout (${event})`,
    });
  } catch (err) {
    await conversion.destroy();
    await restoreCapIfNeeded();
    await sendRejectedMessage(click, event, 'Wallet Update Failed', { advertiserIp });
    reject(500, 'ERROR: Wallet update failed');
  }

  const telegramSent = await sendSuccessMessage(click, eventData, event, conversion.id, totalLeads, todayLeads, advertiserIp);

  await PostbackLog.create({ conversionId: conversion.id, sentToAdmin: 1 });

  const publisherPostback = await Postback.findOne({
    where: { userId: click.userId, offerId: click.offerId, event, status: 'approved' },
  });

  const lines = [];
  let postbackTriggered = false;

  if (publisherPostback?.postbackUrl) {
    const placeholders = {
      '{offerid}': click.offerId,
      '{click_id}': clickId,
      '{event}': event,
      '{payout}': eventData.payoutAmount,
      '{ip}': click.ip || '',
      '{user_agent}': click.userAgent || '',
      '{offer_name}': click.offerName || '',
      '{p1}': click.p1 || '', '{p2}': click.p2 || '', '{p3}': click.p3 || '', '{p4}': click.p4 || '',
      '{sub1}': click.sub1 || '', '{sub2}': click.sub2 || '', '{sub3}': click.sub3 || '',
      '{aff_sub1}': click.aff_sub1 || '', '{aff_sub2}': click.aff_sub2 || '',
      '{conversion_id}': conversion.id,
      '{user_id}': click.userId,
      '{timestamp}': new Date().toISOString(),
    };
    let url = publisherPostback.postbackUrl;
    for (const [token, value] of Object.entries(placeholders)) {
      url = url.split(token).join(String(value));
    }

    let httpCode = 0;
    let response = '';
    try {
      const res = await axios.get(url, { timeout: 10000, maxRedirects: 5, validateStatus: () => true });
      httpCode = res.status;
      response = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    } catch (err) {
      logger.warn('Publisher postback fire failed', { url, message: err.message });
      response = err.message;
    }

    await PostbackLog.update(
      { sentToUser: 1, postbackUrl: url.slice(0, 750), httpCode: String(httpCode).slice(0, 750), response: response.slice(0, 500) },
      { where: { conversionId: conversion.id } }
    );

    postbackTriggered = true;
    lines.push('✅ Postback Triggered!');
    lines.push(`HTTP Code: ${httpCode}`);
    if (response) lines.push(`Response: ${response.slice(0, 200)}`);
  } else {
    lines.push('ℹ️ No approved postback URL found for this event');
  }

  lines.push(telegramSent ? '✅ Telegram notification sent to admin' : 'ℹ️ Telegram notification not configured or failed to send');

  return {
    conversionId: conversion.id,
    payout: eventData.payoutAmount,
    postbackTriggered,
    lines,
  };
}

module.exports = { processPostback };
