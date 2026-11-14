const { Op } = require('sequelize');
const { Click, Conversion, Offer, CampaignCashbackPayout } = require('../models');

const MAX_RESULTS = 500;

// Public lookup by bank account number or the mobile used on the offer page.
// LEFT JOIN conversions LEFT JOIN offers, newest first. This is an
// unauthenticated page, so only the columns the legacy page displayed are
// returned — not the visitor's IP.
async function lookupByIdentifier(query) {
  const search = (query || '').trim();
  if (!search) return [];

  const numericSearch = /^[0-9]{6,20}$/.test(search);
  const clickMatch = numericSearch
    ? [
      { p1: { [Op.like]: `%${search}%` } },
      { p2: { [Op.like]: `%${search}%` } },
      { sub1: search },
    ]
    : [{ p1: search }, { p2: search }, { sub1: search }];

  const clicks = await Click.findAll({
    where: { [Op.or]: clickMatch },
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
  const payouts = conversions.length ? await CampaignCashbackPayout.findAll({
    where: { conversionId: { [Op.in]: conversions.map((c) => c.id) } },
  }) : [];
  const payoutsByConversion = new Map();
  for (const payout of payouts) {
    const list = payoutsByConversion.get(payout.conversionId) || [];
    list.push(payout);
    payoutsByConversion.set(payout.conversionId, list);
  }

  return clicks.map((click) => {
    const conv = conversionByClickId.get(click.clickId);
    const offer = offerById.get(click.offerId);
    const recipientType = click.p1 === search ? 'user' : click.p2 === search ? 'referrer' : 'user';
    const cashback = (payoutsByConversion.get(conv?.id) || []).find((p) => p.recipientType === recipientType);
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
      cashbackStatus: cashback?.status || null,
      cashbackAmount: cashback?.amount || null,
    };
  });
}

module.exports = { lookupByIdentifier };
