const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const offerAdminRoutes = require('./offerAdmin.routes');
const publisherAdminRoutes = require('./publisherAdmin.routes');
const offerPublisherRoutes = require('./offerPublisher.routes');
const campaignRoutes = require('./campaign.routes');
const landingRoutes = require('./landing.routes');
const referralRoutes = require('./referral.routes');
const walletRoutes = require('./wallet.routes');
const withdrawalAdminRoutes = require('./withdrawalAdmin.routes');
const conversionAdminRoutes = require('./conversionAdmin.routes');
const reportRoutes = require('./report.routes');
const ipWhitelistAdminRoutes = require('./ipWhitelistAdmin.routes');
const { approvalRouter: postbackAdminRoutes, logRouter: postbackLogAdminRoutes } = require('./postbackAdmin.routes');
const siteSettingsAdminRoutes = require('./siteSettingsAdmin.routes');
const paymentGatewayAdminRoutes = require('./paymentGatewayAdmin.routes');
const reportAdminRoutes = require('./reportAdmin.routes');
const dashboardPublisherRoutes = require('./dashboardPublisher.routes');
const dashboardAdminRoutes = require('./dashboardAdmin.routes');
const conversionPublisherRoutes = require('./conversionPublisher.routes');
const postbackPublisherRoutes = require('./postbackPublisher.routes');
const profileRoutes = require('./profile.routes');

const router = express.Router();
// /go, /postback, /tracking, /report are mounted directly on the app (not
// under /api) in app.js since nothing else lives at those paths.
// /o and /refer are ALSO React page routes (frontend serves the page at
// that path; the page then calls this API). Mounting them here under
// /api/o and /api/refer keeps the page route and the API route from
// colliding on the same path — see app.js for the longer note.
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin/offers', offerAdminRoutes);
router.use('/admin/publishers', publisherAdminRoutes);
router.use('/publisher/offers', offerPublisherRoutes);
router.use('/publisher/campaigns', campaignRoutes);
router.use('/o', landingRoutes);
router.use('/refer', referralRoutes);
router.use('/publisher/wallet', walletRoutes);
router.use('/admin/withdrawals', withdrawalAdminRoutes);
router.use('/admin/conversions', conversionAdminRoutes);
router.use('/publisher/reports', reportRoutes);
router.use('/admin/settings', siteSettingsAdminRoutes);
router.use('/admin/gateways', paymentGatewayAdminRoutes);
router.use('/admin/reports', reportAdminRoutes);
router.use('/admin/ip-whitelist', ipWhitelistAdminRoutes);
// Two mounts over one router module — approval CRUD (sadmin/approve_postback.php)
// and the last-100 log viewer (sadmin/postbacks.php) — see postbackAdmin.routes.js.
router.use('/admin/postbacks', postbackAdminRoutes);
router.use('/admin/postbacks-log', postbackLogAdminRoutes);
router.use('/publisher/dashboard', dashboardPublisherRoutes);
router.use('/admin/dashboard', dashboardAdminRoutes);
router.use('/publisher/conversions', conversionPublisherRoutes);
router.use('/publisher/postback', postbackPublisherRoutes);
router.use('/publisher/profile', profileRoutes);

module.exports = router;
