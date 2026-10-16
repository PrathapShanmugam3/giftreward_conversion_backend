const express = require('express');
const controller = require('../controllers/offerAdmin.controller');
const validate = require('../validators/handleValidation');
const {
  createOfferRules,
  updateOfferRules,
  idParamRule,
  moderateRequestRules,
  bulkModerateRules,
} = require('../validators/offer.validators');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// NOTE: literal paths (/requests/...) must be registered before the
// parameterized /:id routes, or Express matches "requests" as an :id first.
router.get('/requests/list', controller.listOfferRequests);
router.post('/requests/bulk-moderate', bulkModerateRules, validate, controller.bulkModerateRequests);
router.post('/requests/:id/moderate', moderateRequestRules, validate, controller.moderateRequest);

router.get('/', controller.listOffers);
router.post('/', createOfferRules, validate, controller.createOffer);
router.get('/:id', idParamRule, validate, controller.getOffer);
router.put('/:id', updateOfferRules, validate, controller.updateOffer);
router.delete('/:id', idParamRule, validate, controller.deleteOffer);

module.exports = router;
