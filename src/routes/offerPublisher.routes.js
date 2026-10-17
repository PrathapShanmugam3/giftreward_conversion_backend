const express = require('express');
const controller = require('../controllers/offerPublisher.controller');
const validate = require('../validators/handleValidation');
const { idParamRule, requestOfferRules } = require('../validators/offer.validators');
const { offerPostbackRules, offerPostbackIdRules } = require('../validators/postbackPublisher.validators');
const { requirePublisher } = require('../middleware/auth');

const router = express.Router();
router.use(requirePublisher);

router.get('/', controller.listOffers);
router.get('/:id', idParamRule, validate, controller.getOffer);
router.post('/:id/request', requestOfferRules, validate, controller.requestOffer);

// Per-offer postback CRUD (publisher/offer.php add/edit/delete_postback).
router.get('/:id/postbacks', idParamRule, validate, controller.listOfferPostbacks);
router.post('/:id/postbacks', offerPostbackRules, validate, controller.createOfferPostback);
router.put('/:id/postbacks/:postbackId', offerPostbackIdRules, offerPostbackRules, validate, controller.updateOfferPostback);
router.delete('/:id/postbacks/:postbackId', offerPostbackIdRules, validate, controller.deleteOfferPostback);

module.exports = router;
