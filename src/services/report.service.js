const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const { getReportIpInfo } = require('./geo.service');
const { parseDevice } = require('../utils/userAgent');

// Column set mirrors publisher/reports.php's $column_labels exactly, so the
// frontend's visible-columns picker and CSV/Excel/PDF exports line up with
// what publishers are used to seeing.
const COLUMN_LABELS = {
  click_id: 'Click ID',
  offer_id: 'Offer ID',
  p1: 'P1', p2: 'P2', p3: 'P3', p4: 'P4', p5: 'P5', p6: 'P6', p7: 'P7', p8: 'P8', p9: 'P9',
  sub1: 'Sub1', sub2: 'Sub2', sub3: 'Sub3', sub4: 'Sub4', sub5: 'Sub5',
  sub6: 'Sub6', sub7: 'Sub7', sub8: 'Sub8', sub9: 'Sub9', sub10: 'Sub10',
  aff_sub1: 'Aff Sub1', aff_sub2: 'Aff Sub2', aff_sub3: 'Aff Sub3', aff_sub4: 'Aff Sub4', aff_sub5: 'Aff Sub5',
  aff_sub6: 'Aff Sub6', aff_sub7: 'Aff Sub7', aff_sub8: 'Aff Sub8', aff_sub9: 'Aff Sub9', aff_sub10: 'Aff Sub10',
  googleaid: 'Google AID', deviceid: 'Device ID', iosidfa: 'iOS IDFA', source: 'Source',
  ip: 'IP', location: 'Location', carrier_isp: 'Carrier/ISP', device: 'Device',
  click_time: 'Click Time', conv_id: 'Conv ID', status: 'Status', payout: 'Payout',
};

const DEFAULT_VISIBLE_COLUMNS = {
  click_id: true, offer_id: true, source: true, ip: true, location: true, device: true,
  click_time: true, conv_id: true, status: true, payout: true,
};

function dateRangeForType(type, dateFrom, dateTo) {
  const today = new Date();
  if (type === 'monthly') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from, to, groupBy: 'month' };
  }
  // daily / custom both use the explicit range, grouped by day.
  return {
    from: dateFrom ? new Date(dateFrom) : today,
    to: dateTo ? new Date(dateTo) : today,
    groupBy: 'day',
  };
}

// clicks <-> conversions join on click_id (+ user_id) is NOT a real FK in
// this schema (see database.md), so Sequelize has no association to hang
// an `include` off. Both summary and detailed queries below use raw SQL
// with bound parameters instead of a fragile hand-built `literal()`
// include, which is more honest about what's actually a non-FK join.

function buildStatusFilter(status, paramsOut) {
  if (!status || status === 'all') return '';
  if (status === 'converted') return 'AND cv.id IS NOT NULL';
  if (status === 'not_converted') return 'AND cv.id IS NULL';
  paramsOut.push(status);
  return 'AND cv.status = ?';
}

// ---------------------------------------------------------------------------
// Publisher reports
// ---------------------------------------------------------------------------

async function getPublisherSummary(userId, { type, dateFrom, dateTo, offerId, status }) {
  const { from, to, groupBy } = dateRangeForType(type, dateFrom, dateTo);
  const dateFormat = groupBy === 'month' ? '%b %Y' : '%b %d, %Y';
  const groupExpr = groupBy === 'month' ? "DATE_FORMAT(c.created_at, '%Y-%m')" : 'DATE(c.created_at)';

  const params = [userId, from, to];
  let offerFilter = '';
  if (offerId) {
    offerFilter = 'AND c.offer_id = ?';
    params.push(offerId);
  }
  const statusParams = [];
  const statusFilter = buildStatusFilter(status, statusParams);

  const sql = `
    SELECT
      DATE_FORMAT(c.created_at, '${dateFormat}') AS date,
      COUNT(DISTINCT c.id) AS clicks,
      COUNT(DISTINCT cv.id) AS conversions,
      COALESCE(SUM(CASE WHEN cv.status = 'approved' THEN cv.payout ELSE 0 END), 0) AS revenue
    FROM clicks c
    LEFT JOIN conversions cv ON c.click_id = cv.click_id AND cv.user_id = c.user_id
    WHERE c.user_id = ? AND DATE(c.created_at) BETWEEN ? AND ?
      ${offerFilter} ${statusFilter}
    GROUP BY ${groupExpr}
    ORDER BY MIN(c.created_at) ASC
  `;

  const rows = await sequelize.query(sql, {
    replacements: [...params, ...statusParams],
    type: QueryTypes.SELECT,
  });

  const totals = rows.reduce(
    (acc, r) => ({
      clicks: acc.clicks + Number(r.clicks),
      conversions: acc.conversions + Number(r.conversions),
      revenue: acc.revenue + Number(r.revenue),
    }),
    { clicks: 0, conversions: 0, revenue: 0 }
  );

  return { rows, totals, range: { from, to, type: type || 'daily' } };
}

async function getPublisherDetailed(userId, { dateFrom, dateTo, offerId, status, page = 1, perPage = 10 }) {
  const { from, to } = dateRangeForType('custom', dateFrom, dateTo);

  const params = [userId, from, to];
  let offerFilter = '';
  if (offerId) {
    offerFilter = 'AND c.offer_id = ?';
    params.push(offerId);
  }
  const statusParams = [];
  const statusFilter = buildStatusFilter(status, statusParams);
  const whereClause = `c.user_id = ? AND DATE(c.created_at) BETWEEN ? AND ? ${offerFilter} ${statusFilter}`;
  const allParams = [...params, ...statusParams];

  const [{ total }] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM clicks c LEFT JOIN conversions cv ON c.click_id = cv.click_id AND cv.user_id = c.user_id WHERE ${whereClause}`,
    { replacements: allParams, type: QueryTypes.SELECT }
  );

  const offset = (page - 1) * perPage;
  const rows = await sequelize.query(
    `
      SELECT c.*, cv.id AS conversion_id, cv.event_id, cv.status AS conversion_status,
             cv.payout AS conversion_payout, cv.created_at AS conversion_time
      FROM clicks c
      LEFT JOIN conversions cv ON c.click_id = cv.click_id AND cv.user_id = c.user_id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `,
    { replacements: [...allParams, perPage, offset], type: QueryTypes.SELECT }
  );

  return { rows, total: Number(total), totalPages: Math.ceil(Number(total) / perPage), page, perPage };
}

// Geo enrichment hits an external API per unique IP. A real export can have
// 700+ distinct IPs (confirmed against actual data) — even with
// concurrency that is too slow for one HTTP request/response, and the
// legacy app's sequential lookup genuinely hung at this scale (confirmed by
// hanging a real export during testing). We enrich up to GEO_LOOKUP_CAP
// unique IPs with bounded concurrency inside a hard time budget; any IP
// beyond the cap (or if the budget runs out first) gets a placeholder
// instead of blocking the export. This keeps every export fast and
// finite regardless of data volume.
const GEO_LOOKUP_CONCURRENCY = 10;
const GEO_LOOKUP_CAP = 200;
const GEO_LOOKUP_BUDGET_MS = 15000;
const GEO_NOT_LOOKED_UP = { city: 'Not looked up', region: '', country: '', org: 'Not looked up' };

async function enrichIpsConcurrently(ips) {
  const cache = new Map();
  const capped = ips.slice(0, GEO_LOOKUP_CAP);
  const queue = [...capped];
  const deadline = Date.now() + GEO_LOOKUP_BUDGET_MS;

  async function worker() {
    while (queue.length > 0 && Date.now() < deadline) {
      const ip = queue.shift();
      if (ip === undefined || cache.has(ip)) continue;
      cache.set(ip, await getReportIpInfo(ip));
    }
  }

  await Promise.all(Array.from({ length: GEO_LOOKUP_CONCURRENCY }, worker));

  // Anything left in the queue (cap exceeded or budget ran out) gets a
  // placeholder so the export still completes with every row present.
  for (const ip of queue) {
    if (!cache.has(ip)) cache.set(ip, GEO_NOT_LOOKED_UP);
  }
  for (const ip of ips) {
    if (!cache.has(ip)) cache.set(ip, GEO_NOT_LOOKED_UP);
  }

  return cache;
}

// Builds export-ready rows (geo + device enrichment), respecting the
// visible-columns selection exactly like the legacy export did. `clicks`
// here are the raw rows from getPublisherDetailed's SQL (snake_case,
// conversion_* prefixed columns), not Sequelize model instances.
async function buildExportRows(clicks, visibleColumns) {
  const columns = { ...DEFAULT_VISIBLE_COLUMNS, ...visibleColumns };

  let ipCache = new Map();
  if (columns.location || columns.carrier_isp) {
    const uniqueIps = [...new Set(clicks.map((c) => c.ip))];
    ipCache = await enrichIpsConcurrently(uniqueIps);
  }

  const rows = [];
  for (const click of clicks) {
    const ipInfo = ipCache.get(click.ip) || {};
    const device = parseDevice(click.user_agent);

    const row = {};
    for (const key of Object.keys(COLUMN_LABELS)) {
      if (!columns[key]) continue;
      switch (key) {
        case 'click_id': row[key] = click.click_id; break;
        case 'location': row[key] = `${ipInfo.city || 'Unknown'}, ${ipInfo.region || 'Unknown'}, ${ipInfo.country || 'Unknown'}`; break;
        case 'carrier_isp': row[key] = ipInfo.org || 'Unknown'; break;
        case 'device': row[key] = device; break;
        case 'click_time': row[key] = click.created_at; break;
        case 'conv_id': row[key] = click.conversion_id ?? '—'; break;
        case 'status': row[key] = click.conversion_status ? click.conversion_status[0].toUpperCase() + click.conversion_status.slice(1) : '—'; break;
        case 'payout': row[key] = click.conversion_payout != null ? `₹${click.conversion_payout}` : '₹0.00'; break;
        default: row[key] = click[key] ?? '';
      }
    }
    rows.push(row);
  }

  const headers = Object.keys(COLUMN_LABELS).filter((k) => columns[k]).map((k) => COLUMN_LABELS[k]);
  return { headers, rows };
}

module.exports = {
  COLUMN_LABELS,
  DEFAULT_VISIBLE_COLUMNS,
  dateRangeForType,
  getPublisherSummary,
  getPublisherDetailed,
  buildExportRows,
};
