const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const reportingApiService = require('../services/reportingApi.service');

// Legacy api.php always responded 200 with {success:false, message, data:[]}
// on error (never a non-200 status); /report preserves that response shape
// for compatibility with existing publisher integrations even though the
// URL path itself has changed.
const getReport = asyncHandler(async (req, res) => {
  const authToken = req.query['auth-token'] || '';
  const reportType = req.query.report;

  try {
    const data = await reportingApiService.getPublisherReport(authToken, reportType);
    res.json({ success: true, message: 'Success', data });
  } catch (err) {
    if (err instanceof ApiError) {
      return res.json({ success: false, message: err.message, data: [] });
    }
    throw err;
  }
});

module.exports = { getReport };
