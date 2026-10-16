const asyncHandler = require('../utils/asyncHandler');
const postbackAdminService = require('../services/postbackAdmin.service');

const listPostbacks = asyncHandler(async (req, res) => {
  const { status, offerId, userId, search } = req.query;
  const postbacks = await postbackAdminService.listPostbacksAdmin({ status, offerId, userId, search });
  res.json({ success: true, postbacks });
});

const moderatePostback = asyncHandler(async (req, res) => {
  const { action, ...fields } = req.body;
  const result = await postbackAdminService.moderatePostback(req.params.id, action, fields);
  res.json({ success: true, ...result });
});

const listPostbackLogs = asyncHandler(async (req, res) => {
  const { limit = 100 } = req.query;
  const logs = await postbackAdminService.listPostbackLogs({ limit: Number(limit) });
  res.json({ success: true, logs });
});

module.exports = { listPostbacks, moderatePostback, listPostbackLogs };
