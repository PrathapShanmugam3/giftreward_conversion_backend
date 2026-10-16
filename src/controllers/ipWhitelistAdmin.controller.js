const asyncHandler = require('../utils/asyncHandler');
const ipWhitelistService = require('../services/ipWhitelist.service');

const listIpWhitelist = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const result = await ipWhitelistService.listIpWhitelist({ search, page: Number(page), limit: Number(limit) });
  res.json({ success: true, ...result });
});

const addIp = asyncHandler(async (req, res) => {
  const entry = await ipWhitelistService.addIp(req.body);
  res.status(201).json({ success: true, message: 'IP added successfully', entry });
});

const toggleStatus = asyncHandler(async (req, res) => {
  const entry = await ipWhitelistService.toggleStatus(req.params.id);
  res.json({ success: true, message: 'Status updated successfully', entry });
});

const deleteIp = asyncHandler(async (req, res) => {
  const result = await ipWhitelistService.deleteIp(req.params.id);
  res.json({ success: true, ...result });
});

const bulkAction = asyncHandler(async (req, res) => {
  const result = await ipWhitelistService.bulkAction(req.body);
  res.json({ success: true, ...result });
});

module.exports = { listIpWhitelist, addIp, toggleStatus, deleteIp, bulkAction };
