const { Op } = require('sequelize');
const { User, Conversion, OfferEvent, Click, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');

// Mirrors api.php exactly: auth via users.auth_token, report=1..5 selects a
// date range on conversions.created_at.
function dateCondition(reportType) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (Number(reportType)) {
    case 1: // today
      return { [Op.gte]: today };
    case 2: { // yesterday
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { [Op.gte]: y, [Op.lt]: today };
    }
    case 3: { // last 7 days
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return { [Op.gte]: d };
    }
    case 4: { // last 30 days
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      return { [Op.gte]: d };
    }
    case 5: { // this month
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return { [Op.gte]: d };
    }
    default:
      return null;
  }
}

async function getPublisherReport(authToken, reportType) {
  if (!authToken) throw ApiError.badRequest('Authentication token is required');

  const user = await User.findOne({ where: { authToken } });
  if (!user) throw ApiError.unauthorized('Invalid authentication token');

  const createdAt = dateCondition(reportType);
  if (!createdAt) {
    throw ApiError.badRequest(
      'Invalid report type. Use 1=today, 2=yesterday, 3=last 7 days, 4=last 30 days, 5=this month'
    );
  }

  const conversions = await Conversion.findAll({
    where: { userId: user.id, createdAt },
    include: [{ model: OfferEvent, attributes: ['eventName'] }],
    order: [['createdAt', 'DESC']],
  });

  // clicks.click_id has no unique constraint / real FK, so join it manually
  // per row rather than relying on a Sequelize association.
  const clickIds = conversions.map((c) => c.clickId);
  const clicks = clickIds.length
    ? await Click.findAll({ where: { clickId: { [Op.in]: clickIds } } })
    : [];
  const clickByClickId = new Map(clicks.map((c) => [c.clickId, c]));

  return conversions.map((c) => {
    const click = clickByClickId.get(c.clickId);
    return {
      offerid: c.offerId,
      clickid: c.clickId,
      event: c.OfferEvent?.eventName ?? null,
      p1: click?.p1 ?? null, p2: click?.p2 ?? null, p3: click?.p3 ?? null,
      p4: click?.p4 ?? null, p5: click?.p5 ?? null, p6: click?.p6 ?? null,
      p7: click?.p7 ?? null, p8: click?.p8 ?? null, p9: click?.p9 ?? null,
      sub1: click?.sub1 ?? null, sub2: click?.sub2 ?? null, sub3: click?.sub3 ?? null,
      sub4: click?.sub4 ?? null, sub5: click?.sub5 ?? null,
      aff_sub1: click?.aff_sub1 ?? null, aff_sub2: click?.aff_sub2 ?? null,
      aff_sub3: click?.aff_sub3 ?? null, aff_sub4: click?.aff_sub4 ?? null, aff_sub5: click?.aff_sub5 ?? null,
      ip: click?.ip ?? null,
      payout: c.payout,
      status: c.status,
      timestamp: c.createdAt,
    };
  });
}

module.exports = { getPublisherReport };
