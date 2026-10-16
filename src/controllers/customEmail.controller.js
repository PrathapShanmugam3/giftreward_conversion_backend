const asyncHandler = require('../utils/asyncHandler');
const customEmailService = require('../services/customEmail.service');
const { User } = require('../models');

const listPublishers = asyncHandler(async (req, res) => {
  const publishers = await User.findAll({
    attributes: ['id', 'name', 'email', 'companyName'],
    order: [['name', 'ASC']],
  });
  res.json({ success: true, publishers });
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await customEmailService.getStats();
  res.json({ success: true, stats });
});

const send = asyncHandler(async (req, res) => {
  const { recipientType, publisherIds, singlePublisherId, subject, message } = req.body;
  const result = await customEmailService.sendCustomEmail({
    recipientType,
    publisherIds,
    singlePublisherId,
    subject,
    message,
  });
  res.json({ success: true, ...result });
});

module.exports = { listPublishers, getStats, send };
