const express = require('express');
const controller = require('../controllers/customEmail.controller');
const validate = require('../validators/handleValidation');
const { sendRules } = require('../validators/customEmail.validators');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// Mirrors sadmin/custom_email_sender.php (minus attachments — deferred
// along with the rest of file-upload support, see CUTOVER.md).
router.get('/publishers', controller.listPublishers);
router.get('/stats', controller.getStats);
router.post('/send', sendRules, validate, controller.send);

module.exports = router;
