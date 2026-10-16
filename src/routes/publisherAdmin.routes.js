const express = require('express');
const controller = require('../controllers/publisherAdmin.controller');
const validate = require('../validators/handleValidation');
const {
  createPublisherRules,
  updatePublisherRules,
  idParamRule,
  listPublishersRules,
  resetPasswordRules,
  adjustBalanceRules,
} = require('../validators/publisherAdmin.validators');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

router.get('/', listPublishersRules, validate, controller.listPublishers);
router.post('/', createPublisherRules, validate, controller.createPublisher);
router.get('/:id', idParamRule, validate, controller.getPublisher);
router.put('/:id', updatePublisherRules, validate, controller.updatePublisher);
router.delete('/:id', idParamRule, validate, controller.deletePublisher);
router.post('/:id/reset-password', resetPasswordRules, validate, controller.resetPassword);
router.post('/:id/adjust-balance', adjustBalanceRules, validate, controller.adjustBalance);

module.exports = router;
