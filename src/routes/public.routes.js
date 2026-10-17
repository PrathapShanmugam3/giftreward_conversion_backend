const express = require('express');
const { param } = require('express-validator');
const controller = require('../controllers/public.controller');
const validate = require('../validators/handleValidation');

const router = express.Router();

router.get('/site', controller.getSite);
router.get('/offers', controller.getLatestOffers);
router.get('/assets/:kind', [param('kind').isIn(['banner', 'favicon'])], validate, controller.getAsset);

module.exports = router;
