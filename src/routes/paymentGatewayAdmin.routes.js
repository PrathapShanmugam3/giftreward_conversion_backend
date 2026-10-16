const express = require('express');
const controller = require('../controllers/paymentGatewayAdmin.controller');
const validate = require('../validators/handleValidation');
const { createGatewayRules, updateGatewayRules, idParamRule } = require('../validators/paymentGateway.validators');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

router.get('/', controller.listGateways);
router.post('/', createGatewayRules, validate, controller.createGateway);
router.get('/:id', idParamRule, validate, controller.getGateway);
router.put('/:id', updateGatewayRules, validate, controller.updateGateway);
router.delete('/:id', idParamRule, validate, controller.deleteGateway);

module.exports = router;
