const asyncHandler = require('../utils/asyncHandler');
const walletService = require('../services/wallet.service');

const listWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await walletService.listWithdrawalsAdmin({ status: req.query.status });
  res.json({ success: true, withdrawals });
});

const updateStatus = asyncHandler(async (req, res) => {
  const withdrawal = await walletService.updateWithdrawalStatus(req.params.id, req.body);
  res.json({ success: true, message: 'Withdrawal request updated successfully!', withdrawal });
});

const refreshGatewayStatus = asyncHandler(async (req, res) => {
  const result = await walletService.refreshWithdrawalGatewayStatus(req.params.id);
  res.json({ success: true, ...result });
});

const markPaidManually = asyncHandler(async (req, res) => {
  const withdrawal = await walletService.markWithdrawalPaidManually(req.params.id);
  res.json({ success: true, message: 'Withdrawal marked paid manually', withdrawal });
});

module.exports = { listWithdrawals, updateStatus, refreshGatewayStatus, markPaidManually };
