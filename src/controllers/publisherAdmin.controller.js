const asyncHandler = require('../utils/asyncHandler');
const publisherAdminService = require('../services/publisherAdmin.service');

const listPublishers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const result = await publisherAdminService.listPublishers({ search, page: Number(page), limit: Number(limit) });
  res.json({ success: true, ...result });
});

const getPublisher = asyncHandler(async (req, res) => {
  const publisher = await publisherAdminService.getPublisher(req.params.id);
  res.json({ success: true, publisher });
});

const createPublisher = asyncHandler(async (req, res) => {
  const publisher = await publisherAdminService.createPublisher(req.body);
  res.status(201).json({ success: true, message: 'Publisher created successfully', publisher });
});

const updatePublisher = asyncHandler(async (req, res) => {
  const result = await publisherAdminService.updatePublisher(req.params.id, req.body);
  res.json({ success: true, message: 'Publisher updated successfully', ...result });
});

const deletePublisher = asyncHandler(async (req, res) => {
  const result = await publisherAdminService.deletePublisher(req.params.id);
  res.json({ success: true, ...result });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await publisherAdminService.resetPublisherPassword(req.params.id, req.body.newPassword);
  res.json({ success: true, ...result });
});

const adjustBalance = asyncHandler(async (req, res) => {
  const result = await publisherAdminService.adjustPublisherBalance(req.params.id, req.body);
  res.json({ success: true, message: 'Wallet balance updated successfully', ...result });
});

module.exports = {
  listPublishers,
  getPublisher,
  createPublisher,
  updatePublisher,
  deletePublisher,
  resetPassword,
  adjustBalance,
};
