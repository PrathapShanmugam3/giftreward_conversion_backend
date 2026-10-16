const express = require('express');
const controller = require('../controllers/go.controller');

const router = express.Router();

// Legacy shape: /go/?cid=&uid=&p1..&sub1..&aff_sub1.. (also served at /go
// with no trailing content). No auth — this is the public tracking link
// handed out to publishers.
router.get('/', controller.trackAndRedirect);

module.exports = router;
