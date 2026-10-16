const express = require('express');
const controller = require('../controllers/auth.controller');
const validate = require('../validators/handleValidation');
const {
  registerPublisherRules,
  loginPublisherRules,
  forgotPasswordRules,
  resetPasswordRules,
  loginAdminRules,
} = require('../validators/auth.validators');
const { authLimiter, adminLoginLimiter } = require('../middleware/rateLimiters');
const { requirePublisher, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Publisher
router.post('/publisher/register', authLimiter, registerPublisherRules, validate, controller.registerPublisher);
router.get('/publisher/verify-email', controller.verifyPublisherEmail);
router.post('/publisher/login', authLimiter, loginPublisherRules, validate, controller.loginPublisher);
router.post('/publisher/refresh', controller.refreshPublisher);
router.post('/publisher/logout', controller.logoutPublisher);
router.post('/publisher/forgot-password', authLimiter, forgotPasswordRules, validate, controller.forgotPassword);
router.get('/publisher/reset-password', controller.checkResetToken);
router.post('/publisher/reset-password', authLimiter, resetPasswordRules, validate, controller.resetPassword);
router.get('/publisher/me', requirePublisher, controller.mePublisher);

// Admin
router.post('/admin/login', adminLoginLimiter, loginAdminRules, validate, controller.loginAdmin);
router.post('/admin/refresh', controller.refreshAdmin);
router.post('/admin/logout', controller.logoutAdmin);
router.get('/admin/me', requireAdmin, controller.meAdmin);

module.exports = router;
