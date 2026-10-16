const express = require('express');
const controller = require('../controllers/profile.controller');
const validate = require('../validators/handleValidation');
const { updateProfileRules } = require('../validators/profile.validators');
const { requirePublisher } = require('../middleware/auth');

const router = express.Router();
router.use(requirePublisher);

router.get('/', controller.getProfile);
router.put('/', updateProfileRules, validate, controller.updateProfile);

module.exports = router;
