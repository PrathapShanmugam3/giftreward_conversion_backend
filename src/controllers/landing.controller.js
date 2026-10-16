const asyncHandler = require('../utils/asyncHandler');
const landingService = require('../services/landing.service');

const getLandingData = asyncHandler(async (req, res) => {
  const data = await landingService.getLandingPageData({
    offerId: req.query.o,
    userId: req.query.pid,
    campaignId: req.query.cid,
    referCode: req.query.as,
  });
  res.json({ success: true, ...data });
});

const submitLandingForm = asyncHandler(async (req, res) => {
  const { o: offerId, pid: userId, cid: campaignId, as: referCode } = req.query;
  const result = await landingService.submitLandingForm({
    offerId,
    userId,
    campaignId,
    referCode,
    name: req.body.name,
    mobile: req.body.mobile,
    upiId: req.body.upi_id,
    ip: req.ip,
  });
  res.json({ success: true, ...result });
});

module.exports = { getLandingData, submitLandingForm };
