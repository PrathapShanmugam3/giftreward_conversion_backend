const express = require('express');
const controller = require('../controllers/postbackPublisher.controller');
const validate = require('../validators/handleValidation');
const { createPostbackRules, idParamRule } = require('../validators/postbackPublisher.validators');
const { requirePublisher } = require('../middleware/auth');

const router = express.Router();
router.use(requirePublisher);

router.get('/', controller.listPostbacks);
router.post('/', createPostbackRules, validate, controller.createPostback);
router.delete('/:id', idParamRule, validate, controller.deletePostback);

module.exports = router;
