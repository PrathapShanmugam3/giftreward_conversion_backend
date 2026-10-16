const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/dashboardAdmin.service');

const getDashboard = asyncHandler(async (req, res) => {
  const result = await dashboardService.getDashboard();
  res.json({ success: true, ...result });
});

module.exports = { getDashboard };
