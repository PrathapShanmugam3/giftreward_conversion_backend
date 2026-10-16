const { QueryTypes } = require('sequelize');
const { sequelize, Offer } = require('../models');

// Mirrors publisher/index.php's getStats(): clicks/conversions(approved)/
// revenue/pending for a date range, plus the period switch (today,
// yesterday, 7days, 30days, month) and lifetime totals.
async function getStatsForRange(userId, startDate, endDate) {
  const endCondition = endDate ? 'AND DATE(created_at) <= ?' : '';
  const dateParams = endDate ? [userId, startDate, endDate] : [userId, startDate];

  const [[clicksRow]] = await Promise.all([
    sequelize.query(
      `SELECT COUNT(*) as count FROM clicks WHERE user_id = ? AND DATE(created_at) >= ? ${endCondition}`,
      { replacements: dateParams, type: QueryTypes.SELECT }
    ),
  ]);
  const [convRow] = await sequelize.query(
    `SELECT COUNT(*) as count, SUM(payout) as total FROM conversions WHERE user_id = ? AND status='approved' AND DATE(created_at) >= ? ${endCondition}`,
    { replacements: dateParams, type: QueryTypes.SELECT }
  );
  const [pendingRow] = await sequelize.query(
    `SELECT COUNT(*) as count FROM conversions WHERE user_id = ? AND status='pending' AND DATE(created_at) >= ? ${endCondition}`,
    { replacements: dateParams, type: QueryTypes.SELECT }
  );

  return {
    clicks: Number(clicksRow.count),
    conversions: Number(convRow.count),
    revenue: Number(convRow.total) || 0,
    pending: Number(pendingRow.count),
  };
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function getDashboard(userId, period = '7days') {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = dateNDaysAgo(1);
  const monthStart = `${today.slice(0, 7)}-01`;
  const last7 = dateNDaysAgo(7);
  const last30 = dateNDaysAgo(30);

  const ranges = {
    today: [today, today],
    yesterday: [yesterday, yesterday],
    '7days': [last7, today],
    '30days': [last30, today],
    month: [monthStart, today],
  };
  const [startDate, endDate] = ranges[period] || ranges['7days'];

  const stats = await getStatsForRange(userId, startDate, endDate);

  const [lifetimeClicks] = await sequelize.query('SELECT COUNT(*) as count FROM clicks WHERE user_id = ?', {
    replacements: [userId],
    type: QueryTypes.SELECT,
  });
  const [lifetimeConv] = await sequelize.query(
    "SELECT COUNT(*) as count, SUM(payout) as total FROM conversions WHERE user_id = ? AND status='approved'",
    { replacements: [userId], type: QueryTypes.SELECT }
  );
  const [lifetimePending] = await sequelize.query(
    "SELECT COUNT(*) as count FROM conversions WHERE user_id = ? AND status='pending'",
    { replacements: [userId], type: QueryTypes.SELECT }
  );

  const lifetime = {
    clicks: Number(lifetimeClicks.count),
    conversions: Number(lifetimeConv.count),
    revenue: Number(lifetimeConv.total) || 0,
    pending: Number(lifetimePending.count),
  };

  const recentConversions = await sequelize.query(
    `
      SELECT c.*, o.name as offer, e.event_name
      FROM conversions c
      JOIN offers o ON c.offer_id = o.id
      JOIN offer_events e ON c.event_id = e.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC LIMIT 5
    `,
    { replacements: [userId], type: QueryTypes.SELECT }
  );

  const activeOffers = await Offer.findAll({ where: { status: 'active' }, limit: 5, order: [['createdAt', 'DESC']] });

  return { period, startDate, endDate, stats, lifetime, recentConversions, activeOffers };
}

module.exports = { getDashboard };
