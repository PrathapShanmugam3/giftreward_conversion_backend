const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

// Mirrors publisher/conversions.php: own conversions joined to offer, event,
// and click details, with status/offer/date filters.
async function listConversions(userId, { status, offerId, dateFrom, dateTo }) {
  const params = [userId];
  let filters = '';

  if (status) {
    filters += ' AND c.status = ?';
    params.push(status);
  }
  if (offerId) {
    filters += ' AND c.offer_id = ?';
    params.push(offerId);
  }
  if (dateFrom) {
    filters += ' AND DATE(c.created_at) >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    filters += ' AND DATE(c.created_at) <= ?';
    params.push(dateTo);
  }

  return sequelize.query(
    `
      SELECT
        c.id, c.click_id, c.status, c.created_at, c.payout,
        o.name as offer_name,
        e.event_name,
        cl.p1, cl.p2, cl.sub1, cl.ip, cl.user_agent, cl.created_at as click_time
      FROM conversions c
      JOIN offers o ON c.offer_id = o.id
      JOIN offer_events e ON c.event_id = e.id
      JOIN clicks cl ON c.click_id = cl.click_id
      WHERE c.user_id = ? ${filters}
      ORDER BY c.created_at DESC
    `,
    { replacements: params, type: QueryTypes.SELECT }
  );
}

module.exports = { listConversions };
