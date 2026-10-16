const express = require('express');
const controller = require('../controllers/campaign.controller');
const validate = require('../validators/handleValidation');
const { createCampaignRules, updateCampaignRules, idParamRule, setStatusRules } = require('../validators/campaign.validators');
const { requirePublisher } = require('../middleware/auth');
const { param } = require('express-validator');

const router = express.Router();
router.use(requirePublisher);

router.get('/offer-events/:offerId', param('offerId').isInt(), validate, controller.getOfferEvents);

router.get('/', controller.listCampaigns);
router.post('/', createCampaignRules, validate, controller.createCampaign);
router.get('/:id', idParamRule, validate, controller.getCampaign);
router.put('/:id', updateCampaignRules, validate, controller.updateCampaign);
router.delete('/:id', idParamRule, validate, controller.deleteCampaign);
router.post('/:id/status', setStatusRules, validate, controller.setCampaignStatus);
router.get('/:id/stats', idParamRule, validate, controller.getCampaignStats);

module.exports = router;
