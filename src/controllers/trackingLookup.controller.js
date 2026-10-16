const asyncHandler = require('../utils/asyncHandler');
const trackingLookupService = require('../services/trackingLookup.service');

const lookup = asyncHandler(async (req, res) => {
  const results = await trackingLookupService.lookupByUpi(req.query.q);
  res.json({ success: true, results, count: results.length });
});

module.exports = { lookup };
