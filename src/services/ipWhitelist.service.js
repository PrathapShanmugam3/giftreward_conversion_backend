const dns = require('dns').promises;
const net = require('net');
const { Op } = require('sequelize');
const { IpPageWhitelist } = require('../models');
const ApiError = require('../utils/ApiError');

// NOTE (quirks.md / database.md): despite the table/page name "whitelist",
// status = 1 means the IP is BLOCKED from calling /postback, and status = 0
// means it is allowed. This is the exact legacy semantic that
// src/services/postback.service.js already depends on
// (`if (ipBlock && ipBlock.status === 1) reject(403, ...)`). Do not flip it.

// ---------------------------------------------------------------------------
// Admin: list (paginated, search by ip/description)
// ---------------------------------------------------------------------------
async function listIpWhitelist({ search, page = 1, limit = 10 }) {
  const where = {};
  if (search) {
    where[Op.or] = [
      { ip: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await IpPageWhitelist.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return {
    entries: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

// ---------------------------------------------------------------------------
// Add: mirrors sadmin/ip_whitelist.php add_ip — the admin can paste either a
// raw IP address or a URL; a URL is resolved to its DNS A record.
// ---------------------------------------------------------------------------
function isValidIp(value) {
  return net.isIP(value) !== 0; // 4 or 6, 0 = invalid
}

function looksLikeUrl(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value);
}

async function resolveToIp(input) {
  const trimmed = input.trim();

  if (isValidIp(trimmed)) {
    return trimmed;
  }

  if (!looksLikeUrl(trimmed)) {
    throw ApiError.badRequest(`"${trimmed}" is not a valid IP address or URL`);
  }

  let hostname = trimmed;
  try {
    // Accept bare domains (no scheme) the same way the legacy admin form did
    // by prefixing a scheme before letting URL parse out the hostname.
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    hostname = new URL(withScheme).hostname;
  } catch {
    throw ApiError.badRequest(`Could not parse "${trimmed}" as a URL`);
  }

  try {
    const addresses = await dns.resolve4(hostname);
    if (!addresses.length) throw new Error('empty');
    return addresses[0];
  } catch {
    throw ApiError.badRequest(`Could not resolve "${hostname}" to an IP address`);
  }
}

async function addIp({ input, description, status }) {
  const ip = await resolveToIp(input);

  const existing = await IpPageWhitelist.findOne({ where: { ip } });
  if (existing) {
    throw ApiError.conflict(`IP ${ip} is already in the list`);
  }

  const entry = await IpPageWhitelist.create({
    ip,
    description: description || null,
    // Legacy default is 1 (blocked), matching the model's defaultValue.
    status: status === undefined ? 1 : Number(status),
  });

  return entry;
}

// ---------------------------------------------------------------------------
// Toggle / delete / bulk
// ---------------------------------------------------------------------------
async function toggleStatus(id) {
  const entry = await IpPageWhitelist.findByPk(id);
  if (!entry) throw ApiError.notFound('IP entry not found');

  entry.status = entry.status === 1 ? 0 : 1;
  await entry.save();
  return entry;
}

async function deleteIp(id) {
  const entry = await IpPageWhitelist.findByPk(id);
  if (!entry) throw ApiError.notFound('IP entry not found');
  await entry.destroy();
  return { message: 'IP entry deleted successfully' };
}

async function bulkAction({ action, ids }) {
  if (action === 'delete') {
    await IpPageWhitelist.destroy({ where: { id: { [Op.in]: ids } } });
    return { message: `${ids.length} entries deleted successfully` };
  }

  const status = action === 'activate' ? 1 : action === 'deactivate' ? 0 : null;
  // Same as sadmin/ip_whitelist.php: "activate" sets status=1 (an active
  // entry, which BLOCKS postbacks from that IP) and "deactivate" sets
  // status=0. This was previously inverted here, so the admin page's
  // Block/Unblock bulk buttons did the opposite of their labels.
  if (status === null) throw ApiError.badRequest('Invalid bulk action');

  await IpPageWhitelist.update({ status }, { where: { id: { [Op.in]: ids } } });
  return { message: `${ids.length} entries updated successfully` };
}

module.exports = {
  listIpWhitelist,
  resolveToIp,
  addIp,
  toggleStatus,
  deleteIp,
  bulkAction,
};
