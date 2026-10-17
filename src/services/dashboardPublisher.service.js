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

  const hourly = period === 'today' || period === 'yesterday';
  const chart = await getChartSeries(userId, startDate, endDate, hourly);

  return { period, startDate, endDate, stats, lifetime, recentConversions, activeOffers, chart };
}

// publisher/index.php's chart: 24 hourly buckets for today/yesterday,
// otherwise one bucket per day in the range — clicks, approved conversions
// and earnings. The legacy page ran one query per bucket; this groups in
// SQL and zero-fills the gaps.
async function getChartSeries(userId, startDate, endDate, hourly) {
  const bucketExpr = hourly ? 'HOUR(created_at)' : "DATE_FORMAT(created_at, '%Y-%m-%d')";
  const range = 'user_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ?';
  const replacements = [userId, startDate, endDate];

  const [clickRows, convRows] = await Promise.all([
    sequelize.query(`SELECT ${bucketExpr} as bucket, COUNT(*) as count FROM clicks WHERE ${range} GROUP BY bucket`, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(
      `SELECT ${bucketExpr} as bucket, COUNT(*) as count, SUM(payout) as total FROM conversions WHERE ${range} AND status='approved' GROUP BY bucket`,
      { replacements, type: QueryTypes.SELECT }
    ),
  ]);

  const keyOf = (bucket) => String(hourly ? Number(bucket) : bucket);
  const clicksBy = new Map(clickRows.map((r) => [keyOf(r.bucket), Number(r.count)]));
  const convBy = new Map(convRows.map((r) => [keyOf(r.bucket), { count: Number(r.count), total: Number(r.total) || 0 }]));

  const keys = [];
  if (hourly) {
    for (let h = 0; h < 24; h += 1) keys.push({ key: String(h), label: `${String(h).padStart(2, '0')}:00` });
  } else {
    const d = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    while (d <= end) {
      const key = d.toISOString().slice(0, 10);
      keys.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) });
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }

  return keys.map(({ key, label }) => ({
    label,
    clicks: clicksBy.get(key) || 0,
    conversions: convBy.get(key)?.count || 0,
    earnings: convBy.get(key)?.total || 0,
  }));
}

module.exports = { getDashboard };
