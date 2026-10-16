const asyncHandler = require('../utils/asyncHandler');
const conversionAdminService = require('../services/conversionAdmin.service');

const listConversions = asyncHandler(async (req, res) => {
  const { status, offerId, userId, fromDate, toDate } = req.query;
  const conversions = await conversionAdminService.listConversionsAdmin({ status, offerId, userId, fromDate, toDate });
  res.json({ success: true, conversions });
});

const updateStatus = asyncHandler(async (req, res) => {
  const conversion = await conversionAdminService.updateConversionStatus(req.params.id, req.body.status, req.auth.sub);
  res.json({ success: true, message: 'Conversion status updated successfully!', conversion });
});

module.exports = { listConversions, updateStatus };
