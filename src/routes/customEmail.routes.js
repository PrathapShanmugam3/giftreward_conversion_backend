const express = require('express');
const controller = require('../controllers/customEmail.controller');
const validate = require('../validators/handleValidation');
const { sendRules } = require('../validators/customEmail.validators');
const { requireAdmin } = require('../middleware/auth');
const { emailAttachments } = require('../middleware/upload');

const router = express.Router();
router.use(requireAdmin);

// Mirrors sadmin/custom_email_sender.php, including attachments[] — the
// send endpoint accepts multipart/form-data (files kept in memory only).
router.get('/publishers', controller.listPublishers);
router.get('/stats', controller.getStats);
// multipart sends publisherIds as a JSON string (or repeated fields);
// normalise to an array of ints before the validators run.
function normalizeMultipartFields(req, res, next) {
  let ids = req.body.publisherIds;
  if (typeof ids === 'string') {
    try {
      ids = JSON.parse(ids);
    } catch {
      ids = ids.split(',');
    }
  }
  if (ids !== undefined) req.body.publisherIds = [].concat(ids).map(Number).filter(Number.isInteger);
  next();
}

router.post('/send', emailAttachments, normalizeMultipartFields, sendRules, validate, controller.send);

module.exports = router;
