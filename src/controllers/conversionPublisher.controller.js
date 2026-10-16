const asyncHandler = require('../utils/asyncHandler');
const conversionService = require('../services/conversionPublisher.service');

const listConversions = asyncHandler(async (req, res) => {
  const { status, offerId, dateFrom, dateTo } = req.query;
  const conversions = await conversionService.listConversions(req.auth.sub, { status, offerId, dateFrom, dateTo });
  res.json({ success: true, conversions });
});

module.exports = { listConversions };
