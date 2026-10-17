const express = require('express');
const controller = require('../controllers/siteSettingsAdmin.controller');
const validate = require('../validators/handleValidation');
const { updateSiteSettingsRules, updateAdminEmailRules } = require('../validators/siteSettings.validators');
const { requireAdmin } = require('../middleware/auth');
const { siteAssetUpload } = require('../middleware/upload');

const router = express.Router();
router.use(requireAdmin);

router.get('/', controller.getSettings);
router.put('/', updateSiteSettingsRules, validate, controller.updateSettings);
router.put('/admin-email', updateAdminEmailRules, validate, controller.updateAdminEmail);
// Banner / favicon file uploads (sadmin/settings.php's $_FILES handling).
router.post('/upload/:kind', siteAssetUpload, controller.uploadAsset);

module.exports = router;
