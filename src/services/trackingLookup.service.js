const { Op } = require('sequelize');
const { Click, Conversion, Offer } = require('../models');

const MAX_RESULTS = 500;

// Mirrors tracking/index.php: public UPI lookup across clicks (p1 or p2)
// LEFT JOIN conversions LEFT JOIN offers, newest first. This is an
// unauthenticated page, so only the columns the legacy page displayed are
// returned — not the visitor's IP.
async function lookupByUpi(query) {
  const search = (query || '').trim();
  if (!search) return [];

  const clicks = await Click.findAll({
    where: { [Op.or]: [{ p1: search }, { p2: search }] },
    order: [['createdAt', 'DESC']],
    limit: MAX_RESULTS,
  });
  if (clicks.length === 0) return [];

  const clickIds = clicks.map((c) => c.clickId);
  const offerIds = [...new Set(clicks.map((c) => c.offerId))];

  const [conversions, offers] = await Promise.all([
    Conversion.findAll({ where: { clickId: { [Op.in]: clickIds } } }),
    Offer.findAll({ where: { id: { [Op.in]: offerIds } }, attributes: ['id', 'name', 'image'] }),
  ]);

  const conversionByClickId = new Map(conversions.map((c) => [c.clickId, c]));
  const offerById = new Map(offers.map((o) => [o.id, o]));

  return clicks.map((click) => {
    const conv = conversionByClickId.get(click.clickId);
    const offer = offerById.get(click.offerId);
    return {
      clickId: click.clickId,
      p1: click.p1,
      p2: click.p2,
      source: click.source,
      clickTime: click.createdAt,
      offerId: click.offerId,
      offerName: offer?.name || null,
      offerImage: offer?.image || null,
      status: conv?.status || null,
      eventId: conv?.eventId || null,
      payout: conv?.payout || null,
      conversionTime: conv?.createdAt || null,
    };
  });
}

module.exports = { lookupByUpi };
