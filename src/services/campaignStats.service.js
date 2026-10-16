const { Op, fn, col } = require('sequelize');
const { sequelize, Campaign, CampaignClick, ReferUser } = require('../models');
const ApiError = require('../utils/ApiError');

// Mirrors publisher/campaign-stats.php. NOTE (quirks.md): campaign_clicks
// stores the *referrer's* code in `refercode` (set by the /o landing page
// from its `as` query param), not the campaign's own campaign_id — so these
// stats legitimately come back mostly empty unless referrals were used.
// Reproduced as-is for behavioural parity; not silently "fixed" to join on
// offerId+userId instead.
async function getCampaignStats(userId, campaignRowId) {
  const campaign = await Campaign.findOne({ where: { id: campaignRowId, userId } });
  if (!campaign) throw ApiError.notFound('Campaign not found or you do not have permission to view it');

  const where = {
    offerid: String(campaign.offerId),
    user: String(userId),
    refercode: campaign.campaignId,
  };

  const clickRows = await CampaignClick.findAll({
    attributes: [
      [fn('DATE', col('date')), 'clickDate'],
      [fn('COUNT', col('id')), 'totalClicks'],
      [fn('COUNT', fn('DISTINCT', col('ip'))), 'uniqueClicks'],
    ],
    where,
    group: [fn('DATE', col('date'))],
    order: [[fn('DATE', col('date')), 'DESC']],
    limit: 30,
    raw: true,
  });

  const conversionRows = await CampaignClick.findAll({
    attributes: [
      [fn('DATE', col('date')), 'conversionDate'],
      [fn('COUNT', col('id')), 'totalConversions'],
      [fn('SUM', col('amount')), 'totalPayout'],
    ],
    where: { ...where, amount: { [Op.gt]: 0 } },
    group: [fn('DATE', col('date'))],
    order: [[fn('DATE', col('date')), 'DESC']],
    limit: 30,
    raw: true,
  });

  const referralRows = await ReferUser.findAll({
    attributes: [
      [fn('DATE', col('created_at')), 'referralDate'],
      [fn('COUNT', col('id')), 'totalReferrals'],
    ],
    where: { campaignId: campaign.campaignId, userId: String(userId) },
    group: [fn('DATE', col('created_at'))],
    order: [[fn('DATE', col('created_at')), 'DESC']],
    limit: 30,
    raw: true,
  });

  const recentConversions = await CampaignClick.findAll({
    where: { ...where, amount: { [Op.gt]: 0 } },
    order: [['date', 'DESC']],
    limit: 10,
  });

  const totalClicks = clickRows.reduce((sum, r) => sum + Number(r.totalClicks), 0);
  const uniqueClicks = clickRows.reduce((sum, r) => sum + Number(r.uniqueClicks), 0);
  const totalConversions = conversionRows.reduce((sum, r) => sum + Number(r.totalConversions), 0);
  const totalPayout = conversionRows.reduce((sum, r) => sum + Number(r.totalPayout || 0), 0);
  const totalReferrals = referralRows.reduce((sum, r) => sum + Number(r.totalReferrals), 0);
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  return {
    campaign,
    clickStats: clickRows,
    conversionStats: conversionRows,
    referralStats: referralRows,
    recentConversions,
    totals: { totalClicks, uniqueClicks, totalConversions, totalPayout, totalReferrals, conversionRate },
  };
}

module.exports = { getCampaignStats };
