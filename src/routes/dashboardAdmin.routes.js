const express = require('express');
const controller = require('../controllers/dashboardAdmin.controller');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);
router.get('/', controller.getDashboard);

module.exports = router;
