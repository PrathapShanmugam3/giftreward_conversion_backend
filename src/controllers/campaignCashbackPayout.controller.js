const asyncHandler = require('../utils/asyncHandler');
const payoutService = require('../services/campaignCashbackPayout.service');

const list = asyncHandler(async (req, res) => {
  const payouts = await payoutService.listPayouts({ status: req.query.status });
  res.json({ success: true, payouts });
});

const pay = asyncHandler(async (req, res) => {
  const payout = await payoutService.payPayout(req.params.id, req.body.gatewayId);
  res.json({ success: true, payout });
});

const refresh = asyncHandler(async (req, res) => {
  const result = await payoutService.refreshPayoutStatus(req.params.id);
  res.json({ success: true, ...result });
});

module.exports = { list, pay, refresh };
