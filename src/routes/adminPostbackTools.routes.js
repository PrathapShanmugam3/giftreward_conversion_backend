const express = require('express');
const controller = require('../controllers/adminPostback.controller');
const validate = require('../validators/handleValidation');
const { offerIdParamRule, fireBatchRules } = require('../validators/adminPostback.validators');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// Mirrors sadmin/postback.php (token/URL + reset) and sadmin/firepostback.php
// (replay a batch of click IDs through the real postback flow).
router.get('/', controller.getInfo);
router.post('/reset-token', controller.resetToken);
router.get('/fire/offers', controller.listOffers);
router.get('/fire/offers/:offerId/events', offerIdParamRule, validate, controller.listEvents);
router.post('/fire', fireBatchRules, validate, controller.fireBatch);

module.exports = router;
