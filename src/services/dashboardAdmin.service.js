const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

// Mirrors sadmin/index.php: network-wide totals, today's figures, 6-month
// revenue/conversion-rate trend, 5 most recent approved conversions, top 5
// offers by revenue.
async function getDashboard() {
  const [
    [usersRow],
    [offersRow],
    [clicksRow],
    [conversionsRow],
    [revenueRow],
    [pendingWithdrawalsRow],
    [todayConvRow],
    [todayClicksRow],
  ] = await Promise.all([
    sequelize.query('SELECT COUNT(*) as count FROM users', { type: QueryTypes.SELECT }),
    sequelize.query("SELECT COUNT(*) as count FROM offers WHERE status='active'", { type: QueryTypes.SELECT }),
    sequelize.query('SELECT COUNT(*) as count FROM clicks', { type: QueryTypes.SELECT }),
    sequelize.query("SELECT COUNT(*) as count FROM conversions WHERE status='approved'", { type: QueryTypes.SELECT }),
    sequelize.query("SELECT SUM(payout) as total FROM conversions WHERE status='approved'", { type: QueryTypes.SELECT }),
    sequelize.query("SELECT COUNT(*) as count FROM withdrawal_requests WHERE status='pending'", { type: QueryTypes.SELECT }),
    sequelize.query("SELECT COUNT(*) as count FROM conversions WHERE status='approved' AND DATE(created_at) = CURDATE()", {
      type: QueryTypes.SELECT,
    }),
    sequelize.query('SELECT COUNT(*) as count FROM clicks WHERE DATE(created_at) = CURDATE()', { type: QueryTypes.SELECT }),
  ]);

  const usersCount = Number(usersRow.count);
  const offersCount = Number(offersRow.count);
  const clicksCount = Number(clicksRow.count);
  const conversionsCount = Number(conversionsRow.count);
  const revenue = Number(revenueRow.total) || 0;
  const pendingWithdrawals = Number(pendingWithdrawalsRow.count);
  const todayConversions = Number(todayConvRow.count);
  const todayClicks = Number(todayClicksRow.count);

  const conversionRate = clicksCount > 0 ? (conversionsCount / clicksCount) * 100 : 0;
  const todayConversionRate = todayClicks > 0 ? (todayConversions / todayClicks) * 100 : 0;

  const revenueData = await sequelize.query(
    `
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
             SUM(payout) as revenue,
             COUNT(*) as conversions,
             (SELECT COUNT(*) FROM clicks WHERE DATE_FORMAT(created_at, '%Y-%m') = month) as clicks,
             (COUNT(*) / NULLIF((SELECT COUNT(*) FROM clicks WHERE DATE_FORMAT(created_at, '%Y-%m') = month), 0)) * 100 as cr
      FROM conversions
      WHERE status='approved'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `,
    { type: QueryTypes.SELECT }
  );

  const recentConversions = await sequelize.query(
    `
      SELECT c.id, c.payout, u.name as publisher, o.name as offer, c.created_at
      FROM conversions c
      JOIN users u ON c.user_id = u.id
      JOIN offers o ON c.offer_id = o.id
      WHERE c.status='approved'
      ORDER BY c.created_at DESC
      LIMIT 5
    `,
    { type: QueryTypes.SELECT }
  );

  const topOffers = await sequelize.query(
    `
      SELECT
        o.id, o.name,
        COUNT(c.id) as conversions,
        (SELECT COUNT(*) FROM clicks WHERE offer_id = o.id) as clicks,
        (COUNT(c.id) / NULLIF((SELECT COUNT(*) FROM clicks WHERE offer_id = o.id), 0)) * 100 as cr,
        SUM(c.payout) as revenue
      FROM offers o
      LEFT JOIN conversions c ON o.id = c.offer_id AND c.status='approved'
      GROUP BY o.id, o.name
      HAVING conversions > 0
      ORDER BY revenue DESC
      LIMIT 5
    `,
    { type: QueryTypes.SELECT }
  );

  return {
    usersCount,
    offersCount,
    clicksCount,
    conversionsCount,
    revenue,
    pendingWithdrawals,
    conversionRate: Number(conversionRate.toFixed(2)),
    todayConversions,
    todayClicks,
    todayConversionRate: Number(todayConversionRate.toFixed(2)),
    revenueData: revenueData.reverse(),
    recentConversions,
    topOffers,
  };
}

module.exports = { getDashboard };
