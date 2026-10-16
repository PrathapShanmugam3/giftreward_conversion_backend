const asyncHandler = require('../utils/asyncHandler');
const walletService = require('../services/wallet.service');

const getOverview = asyncHandler(async (req, res) => {
  const overview = await walletService.getWalletOverview(req.auth.sub);
  res.json({ success: true, ...overview });
});

const requestWithdrawal = asyncHandler(async (req, res) => {
  const withdrawal = await walletService.requestWithdrawal(req.auth.sub, req.body);
  res.status(201).json({ success: true, message: 'Withdrawal request submitted successfully!', withdrawal });
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await walletService.getInvoice(req.auth.sub, req.params.id);
  res.json({ success: true, ...invoice });
});

module.exports = { getOverview, requestWithdrawal, getInvoice };
