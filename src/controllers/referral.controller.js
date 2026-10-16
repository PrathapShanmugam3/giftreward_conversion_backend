const asyncHandler = require('../utils/asyncHandler');
const referralService = require('../services/referral.service');

const getReferralData = asyncHandler(async (req, res) => {
  const data = await referralService.getReferralPageData({
    offerId: req.query.o,
    campaignId: req.query.cid,
  });
  res.json({ success: true, ...data });
});

const submitReferral = asyncHandler(async (req, res) => {
  const { o: offerId, pid: userId, cid: campaignId } = req.query;
  const result = await referralService.submitReferral({
    offerId,
    userId,
    campaignId,
    upiId: req.body.upi_id,
    telegramChannel: req.body.telegram_channel,
    ip: req.ip,
  });
  res.json({ success: true, ...result });
});

module.exports = { getReferralData, submitReferral };
