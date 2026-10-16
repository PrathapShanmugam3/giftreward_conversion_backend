const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { sanitize } = require('../utils/sanitize');

// Mirrors publisher/profile.php: update name/email/company/contact, and
// optionally change password (requires the current password, matching
// legacy). Email must stay unique across other users.
async function getProfile(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

async function updateProfile(userId, { name, email, companyName, contactNumber, currentPassword, newPassword }) {
  const user = await User.scope('withPassword').findByPk(userId);
  if (!user) throw ApiError.notFound('User not found');

  const cleanEmail = sanitize(email).toLowerCase();
  const existing = await User.findOne({ where: { email: cleanEmail, id: { [Op.ne]: userId } } });
  if (existing) throw ApiError.conflict('Email already exists');

  if (newPassword) {
    if (!currentPassword) throw ApiError.badRequest('Current password is required to change password');
    const ok = await bcrypt.compare(sanitize(currentPassword), user.password);
    if (!ok) throw ApiError.badRequest('Current password is incorrect');
    if (newPassword.length < 8) throw ApiError.badRequest('New password must be at least 8 characters');
    user.password = await bcrypt.hash(sanitize(newPassword), 10);
  }

  user.name = sanitize(name);
  user.email = cleanEmail;
  user.companyName = sanitize(companyName);
  user.contactNumber = sanitize(contactNumber);
  await user.save();

  return getProfile(userId);
}

module.exports = { getProfile, updateProfile };
