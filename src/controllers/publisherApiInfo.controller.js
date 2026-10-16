const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

// Mirrors publisher/api-documentation.php's API key section: surfaces the
// publisher's own auth_token. Deliberately a dedicated endpoint rather than
// part of the general profile payload (profile.service's publicUser()
// omits it) so the token isn't sent on every profile fetch, only when the
// API docs page is actually opened.
const getApiInfo = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.auth.sub, { attributes: ['authToken'] });
  if (!user) throw ApiError.notFound('User not found');
  res.json({
    success: true,
    authToken: user.authToken,
    reportUrl: `${env.appBaseUrl}/report`,
  });
});

module.exports = { getApiInfo };
