const { QueryTypes } = require('sequelize');
const { sequelize, Offer } = require('../models');
const { buildStatusFilterAdmin } = require('./reportAdminHelpers');

// Mirrors sadmin/reports.php: a network-wide click/conversion report (not
// scoped to one publisher), with optional publisher_id/offer_id/status
// filters and a 500-row cap on the detailed view, same as legacy.
const DETAIL_ROW_CAP = 500;

async function getAdminReport({ startDate, endDate, publisherId, offerId, statusFilter }) {
  const from = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const to = endDate || new Date().toISOString().slice(0, 10);

  const params = [from, to];
  let extraFilter = '';
  if (publisherId) {
    extraFilter += ' AND c.user_id = ?';
    params.push(publisherId);
  }
  if (offerId) {
    extraFilter += ' AND c.offer_id = ?';
    params.push(offerId);
  }
  const statusParams = [];
  extraFilter += buildStatusFilterAdmin(statusFilter, statusParams);

  const whereClause = `DATE(c.created_at) BETWEEN ? AND ? ${extraFilter}`;
  const allParams = [...params, ...statusParams];

  const clicks = await sequelize.query(
    `
      SELECT
        c.id AS click_id, c.click_id AS tracking_id, c.created_at AS click_time,
        u.name AS publisher_name, o.name AS offer_name, c.ip, c.user_agent,
        c.p1, c.p2, c.p3, c.p4, c.p5, c.p6, c.p7, c.p8, c.p9,
        c.sub1, c.sub2, c.sub3, c.sub4, c.sub5, c.sub6, c.sub7, c.sub8, c.sub9, c.sub10,
        c.aff_sub1, c.aff_sub2, c.aff_sub3, c.aff_sub4, c.aff_sub5,
        c.aff_sub6, c.aff_sub7, c.aff_sub8, c.aff_sub9, c.aff_sub10,
        c.googleaid, c.deviceid, c.iosidfa, c.source,
        cv.id AS conversion_id, cv.status AS conversion_status, cv.payout, cv.created_at AS conversion_time
      FROM clicks c
      JOIN users u ON c.user_id = u.id
      JOIN offers o ON c.offer_id = o.id
      LEFT JOIN conversions cv ON c.click_id = cv.click_id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ${DETAIL_ROW_CAP}
    `,
    { replacements: allParams, type: QueryTypes.SELECT }
  );

  const [stats] = await sequelize.query(
    `
      SELECT
        COUNT(DISTINCT c.id) AS total_clicks,
        COUNT(DISTINCT cv.id) AS total_conversions,
        SUM(CASE WHEN cv.status = 'approved' THEN 1 ELSE 0 END) AS approved_conversions,
        SUM(CASE WHEN cv.status = 'approved' THEN cv.payout ELSE 0 END) AS total_payout,
        COUNT(DISTINCT c.user_id) AS unique_publishers,
        ROUND(COUNT(DISTINCT cv.id) * 100.0 / NULLIF(COUNT(DISTINCT c.id), 0), 2) AS conversion_rate
      FROM clicks c
      LEFT JOIN conversions cv ON c.click_id = cv.click_id
      WHERE ${whereClause}
    `,
    { replacements: allParams, type: QueryTypes.SELECT }
  );

  return {
    clicks,
    stats: {
      totalClicks: Number(stats.total_clicks) || 0,
      totalConversions: Number(stats.total_conversions) || 0,
      approvedConversions: Number(stats.approved_conversions) || 0,
      totalPayout: Number(stats.total_payout) || 0,
      uniquePublishers: Number(stats.unique_publishers) || 0,
      conversionRate: Number(stats.conversion_rate) || 0,
    },
    range: { from, to },
  };
}

// Mirrors sadmin/campaign-stats.php: per-active-offer clicks/conversions/
// payout within a date range, computed from clicks/conversions directly
// (NOT from campaign_clicks — that's the publisher-side campaign-stats
// quirk documented in campaignStats.service.js; the admin page uses the
// real offer-level tracking tables instead).
async function getAdminCampaignStats({ startDate, endDate, offerId }) {
  const from = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const to = endDate || new Date().toISOString().slice(0, 10);

  const where = { status: 'active' };
  if (offerId) where.id = offerId;

  const offers = await Offer.findAll({ where, attributes: ['id', 'name'], order: [['name', 'ASC']] });
  if (offers.length === 0) return { offers: [], range: { from, to } };

  const offerIds = offers.map((o) => o.id);
  const placeholders = offerIds.map(() => '?').join(',');

  const rows = await sequelize.query(
    `
      SELECT
        o.id,
        o.name,
        (SELECT COUNT(*) FROM clicks c WHERE c.offer_id = o.id AND DATE(c.created_at) BETWEEN ? AND ?) AS clicks,
        (SELECT COUNT(*) FROM conversions cv WHERE cv.offer_id = o.id AND DATE(cv.created_at) BETWEEN ? AND ?) AS conversions,
        (SELECT COALESCE(SUM(cv.payout), 0) FROM conversions cv WHERE cv.offer_id = o.id AND cv.status = 'approved' AND DATE(cv.created_at) BETWEEN ? AND ?) AS payout
      FROM offers o
      WHERE o.id IN (${placeholders})
      ORDER BY o.name ASC
    `,
    { replacements: [from, to, from, to, from, to, ...offerIds], type: QueryTypes.SELECT }
  );

  return { offers: rows, range: { from, to } };
}

module.exports = { getAdminReport, getAdminCampaignStats, DETAIL_ROW_CAP };
