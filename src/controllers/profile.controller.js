const asyncHandler = require('../utils/asyncHandler');
const profileService = require('../services/profile.service');
const authService = require('../services/auth.service');

const getProfile = asyncHandler(async (req, res) => {
  const user = await profileService.getProfile(req.auth.sub);
  res.json({ success: true, user: authService.publicUser(user) });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await profileService.updateProfile(req.auth.sub, req.body);
  res.json({ success: true, message: 'Profile updated successfully!', user: authService.publicUser(user) });
});

module.exports = { getProfile, updateProfile };
