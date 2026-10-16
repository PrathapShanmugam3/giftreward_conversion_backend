const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const authService = require('../services/auth.service');
const ApiError = require('../utils/ApiError');
const { User, Admin } = require('../models');

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, name, token) {
  res.cookie(name, token, REFRESH_COOKIE_OPTS);
}

function clearRefreshCookie(res, name) {
  res.clearCookie(name, { ...REFRESH_COOKIE_OPTS, maxAge: undefined });
}

// ---------------------------------------------------------------------------
// Publisher
// ---------------------------------------------------------------------------
const registerPublisher = asyncHandler(async (req, res) => {
  const result = await authService.registerPublisher(req.body);
  res.status(201).json({ success: true, ...result });
});

const verifyPublisherEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyPublisherEmail(req.query.token || req.body.token);
  res.json({ success: true, ...result });
});

const loginPublisher = asyncHandler(async (req, res) => {
  const ip = req.ip;
  const { accessToken, refreshToken, user } = await authService.loginPublisher({ ...req.body, ip });
  setRefreshCookie(res, 'publisherRefreshToken', refreshToken);
  res.json({ success: true, accessToken, user });
});

const refreshPublisher = asyncHandler(async (req, res) => {
  const token = req.cookies?.publisherRefreshToken;
  const { accessToken, user } = await authService.refreshPublisherToken(token);
  res.json({ success: true, accessToken, user });
});

const logoutPublisher = asyncHandler(async (req, res) => {
  clearRefreshCookie(res, 'publisherRefreshToken');
  res.json({ success: true, message: 'Logged out' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json({ success: true, ...result });
});

const checkResetToken = asyncHandler(async (req, res) => {
  const result = await authService.verifyResetToken(req.query.token);
  res.json({ success: true, ...result });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json({ success: true, ...result });
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
const loginAdmin = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.loginAdmin(req.body);
  setRefreshCookie(res, 'adminRefreshToken', refreshToken);
  res.json({ success: true, accessToken, user });
});

const refreshAdmin = asyncHandler(async (req, res) => {
  const token = req.cookies?.adminRefreshToken;
  const { accessToken, user } = await authService.refreshAdminToken(token);
  res.json({ success: true, accessToken, user });
});

const logoutAdmin = asyncHandler(async (req, res) => {
  clearRefreshCookie(res, 'adminRefreshToken');
  res.json({ success: true, message: 'Logged out' });
});

const mePublisher = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.auth.sub);
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, user: authService.publicUser(user) });
});

const meAdmin = asyncHandler(async (req, res) => {
  const admin = await Admin.findByPk(req.auth.sub);
  if (!admin) throw ApiError.notFound('Admin not found');
  res.json({ success: true, user: authService.publicAdmin(admin) });
});

module.exports = {
  registerPublisher,
  verifyPublisherEmail,
  loginPublisher,
  refreshPublisher,
  logoutPublisher,
  forgotPassword,
  checkResetToken,
  resetPassword,
  mePublisher,
  loginAdmin,
  refreshAdmin,
  logoutAdmin,
  meAdmin,
};
