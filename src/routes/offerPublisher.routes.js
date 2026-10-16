const express = require('express');
const controller = require('../controllers/offerPublisher.controller');
const validate = require('../validators/handleValidation');
const { idParamRule, requestOfferRules } = require('../validators/offer.validators');
const { requirePublisher } = require('../middleware/auth');

const router = express.Router();
router.use(requirePublisher);

router.get('/', controller.listOffers);
router.get('/:id', idParamRule, validate, controller.getOffer);
router.post('/:id/request', requestOfferRules, validate, controller.requestOffer);

module.exports = router;
