const express = require('express');
const controller = require('../controllers/postback.controller');

const router = express.Router();

// Long form, mounted at /postback in app.js: /postback?click_id=&event=&key=
router.get('/', controller.longForm);

module.exports = router;
