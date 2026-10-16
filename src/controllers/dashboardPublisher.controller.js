const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/dashboardPublisher.service');

const getDashboard = asyncHandler(async (req, res) => {
  const period = req.query.period || '7days';
  const result = await dashboardService.getDashboard(req.auth.sub, period);
  res.json({ success: true, ...result });
});

module.exports = { getDashboard };
