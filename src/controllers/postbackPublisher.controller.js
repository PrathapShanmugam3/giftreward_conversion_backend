const asyncHandler = require('../utils/asyncHandler');
const postbackService = require('../services/postbackPublisher.service');

const listPostbacks = asyncHandler(async (req, res) => {
  const postbacks = await postbackService.listAllOwnPostbacks(req.auth.sub);
  res.json({ success: true, postbacks });
});

const createPostback = asyncHandler(async (req, res) => {
  const postback = await postbackService.createPostback(req.auth.sub, req.body);
  res.status(201).json({ success: true, message: 'Postback URL submitted for approval!', postback });
});

const deletePostback = asyncHandler(async (req, res) => {
  const result = await postbackService.deletePostback(req.auth.sub, req.params.id);
  res.json({ success: true, ...result });
});

module.exports = { listPostbacks, createPostback, deletePostback };
