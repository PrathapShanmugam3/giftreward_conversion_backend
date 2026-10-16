const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { sequelize } = require('../config/database');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    await sequelize.authenticate();
    res.json({ success: true, message: 'ok', db: 'connected', time: new Date().toISOString() });
  })
);

module.exports = router;
