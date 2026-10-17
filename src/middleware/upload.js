const multer = require('multer');
const ApiError = require('../utils/ApiError');

// Memory storage only: this backend runs on Vercel's ephemeral filesystem,
// so uploads are either persisted to the DB (site banner/favicon) or used
// in-request and discarded (email attachments). Vercel caps request bodies
// at ~4.5MB, which is why the limits below stay well under that.

// Mirrors sadmin/settings.php's checks: banner <= 2MB jpg/png/gif/webp,
// favicon <= 500KB ico/png/gif/jpg.
const SITE_ASSET_RULES = {
  banner: { maxBytes: 2 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
  favicon: {
    maxBytes: 500 * 1024,
    mimes: ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/gif', 'image/jpeg'],
  },
};

function siteAssetUpload(req, res, next) {
  const rule = SITE_ASSET_RULES[req.params.kind];
  if (!rule) return next(ApiError.badRequest('Unknown asset type'));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: rule.maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!rule.mimes.includes(file.mimetype)) return cb(ApiError.badRequest('Unsupported file type'));
      return cb(null, true);
    },
  }).single('file');

  return upload(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest(`File is too large (max ${Math.round(rule.maxBytes / 1024)}KB)`));
    }
    if (err) return next(err);
    if (!req.file) return next(ApiError.badRequest('No file uploaded'));
    return next();
  });
}

// custom_email_sender.php allowed attachments[]; keep the total small
// enough to fit in one serverless request.
const emailAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 5 },
}).array('attachments', 5);

function emailAttachments(req, res, next) {
  emailAttachmentUpload(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return next(ApiError.badRequest('Each attachment must be 3MB or less'));
    if (err?.code === 'LIMIT_FILE_COUNT' || err?.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(ApiError.badRequest('At most 5 attachments are allowed'));
    }
    return next(err);
  });
}

module.exports = { siteAssetUpload, emailAttachments, SITE_ASSET_RULES };
