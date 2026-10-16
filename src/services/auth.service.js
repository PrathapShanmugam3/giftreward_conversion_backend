const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Admin, BlockedIp, SiteConfig } = require('../models');
const ApiError = require('../utils/ApiError');
const { sanitize } = require('../utils/sanitize');
const { randomHex } = require('../utils/tokens');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { verifyRecaptcha } = require('./recaptcha.service');
const { sendMail } = require('./mail.service');
const { renderTemplate } = require('./emailTemplate.service');
const env = require('../config/env');
const logger = require('../utils/logger');

const LOCKOUT_MS = 3 * 60 * 60 * 1000; // 3 hours, matches legacy `last_attempt + 3h`
const MAX_ATTEMPTS = 5;
const IP_LOCKOUT_MS = 3 * 60 * 60 * 1000;

async function getSiteConfig() {
  return SiteConfig.findByPk(1);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    companyName: user.companyName,
    contactNumber: user.contactNumber,
    walletBalance: user.walletBalance,
    status: user.status,
  };
}

function publicAdmin(admin) {
  return { id: admin.id, username: admin.username, email: admin.email };
}

// ---------------------------------------------------------------------------
// Publisher: register
// ---------------------------------------------------------------------------
async function registerPublisher({ name, email, password, companyName, contactNumber, recaptchaToken }) {
  const recaptchaOk = await verifyRecaptcha(recaptchaToken);
  if (!recaptchaOk) throw ApiError.badRequest('Please verify you are not a robot.');

  const cleanEmail = sanitize(email).toLowerCase();
  const existing = await User.findOne({ where: { email: cleanEmail } });
  if (existing) throw ApiError.conflict('Email already registered.');

  const hashed = await bcrypt.hash(sanitize(password), 10);
  const authToken = randomHex(32);
  const verificationToken = randomHex(32);

  const user = await User.create({
    name: sanitize(name),
    email: cleanEmail,
    password: hashed,
    companyName: sanitize(companyName),
    contactNumber: sanitize(contactNumber),
    // FIX (quirks.md): legacy set status=0 on register AND on verify, so
    // verified users could never log in. status starts at 0 (pending email
    // verification) and verifyEmail() below correctly flips it to 1.
    status: 0,
    authToken,
    verificationToken,
    walletBalance: 0,
  });

  const site = await getSiteConfig();
  const siteName = site?.siteName || 'GiftReward';
  const verificationLink = `${env.frontendUrl}/publisher/verify-email?token=${verificationToken}`;

  const html = renderTemplate('verify_email', {
    subject: `Verify Your Email - ${siteName}`,
    name: user.name,
    company_name: siteName,
    verification_link: verificationLink,
    year: new Date().getFullYear(),
  });

  try {
    await sendMail({ to: user.email, subject: `Verify Your Email - ${siteName}`, html });
  } catch (err) {
    logger.error('Failed to send verification email', { message: err.message });
  }

  return { message: 'Registration successful! Please check your email to verify your account.' };
}

// ---------------------------------------------------------------------------
// Publisher: verify email
// ---------------------------------------------------------------------------
async function verifyPublisherEmail(token) {
  const cleanToken = sanitize(token);
  const user = await User.findOne({ where: { verificationToken: cleanToken } });
  if (!user) throw ApiError.badRequest('Invalid verification token.');

  if (user.status === 1) {
    throw ApiError.badRequest('Account already verified.');
  }

  // FIX (quirks.md): legacy bug set status back to 0 here. Verifying must
  // activate the account.
  user.status = 1;
  user.verificationToken = null;
  await user.save();

  return { message: 'Email verified successfully. You can now log in.' };
}

// ---------------------------------------------------------------------------
// Publisher: login
// ---------------------------------------------------------------------------
async function loginPublisher({ email, password, recaptchaToken, ip }) {
  if (ip) {
    const blocked = await BlockedIp.findByPk(ip);
    if (blocked && blocked.blockedUntil && new Date(blocked.blockedUntil) > new Date()) {
      throw ApiError.forbidden('Too many attempts from this IP. Try again later.');
    }
  }

  const recaptchaOk = await verifyRecaptcha(recaptchaToken);
  if (!recaptchaOk) throw ApiError.badRequest('Please verify you are not a robot.');

  const cleanEmail = sanitize(email).toLowerCase();
  const user = await User.scope('withPassword').findOne({ where: { email: cleanEmail } });
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  // Auto-unlock after 3h, matching legacy behaviour.
  if (user.status === 0 && user.lastAttempt && Date.now() - new Date(user.lastAttempt).getTime() > LOCKOUT_MS) {
    user.status = 1;
    user.loginAttempts = 0;
    user.lastAttempt = null;
    await user.save();
  }

  if (user.status === 0) {
    throw ApiError.forbidden('Account locked or pending verification. Try again later or check your email.');
  }

  const passwordOk = await bcrypt.compare(sanitize(password), user.password);
  if (!passwordOk) {
    const attempts = user.loginAttempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      user.status = 0;
      user.loginAttempts = attempts;
      user.lastAttempt = new Date();
      await user.save();

      if (ip) {
        const existingBlock = await BlockedIp.findByPk(ip);
        if (existingBlock) {
          existingBlock.attempts += 1;
          existingBlock.blockedUntil = new Date(Date.now() + IP_LOCKOUT_MS);
          await existingBlock.save();
        } else {
          await BlockedIp.create({ ipAddress: ip, attempts: 1, blockedUntil: new Date(Date.now() + IP_LOCKOUT_MS) });
        }
      }
      throw ApiError.forbidden('Too many failed attempts. Account locked for 3 hours.');
    }

    user.loginAttempts = attempts;
    user.lastAttempt = new Date();
    await user.save();
    throw ApiError.unauthorized(`Invalid credentials. Attempt ${attempts} of ${MAX_ATTEMPTS}`);
  }

  user.loginAttempts = 0;
  user.lastAttempt = null;
  user.lastIp = ip || user.lastIp;
  await user.save();

  const accessToken = signAccessToken({ sub: user.id, role: 'publisher' });
  const refreshToken = signRefreshToken({ sub: user.id, role: 'publisher' });

  return { accessToken, refreshToken, user: publicUser(user) };
}

async function refreshPublisherToken(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Missing refresh token');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  if (payload.role !== 'publisher') throw ApiError.unauthorized('Invalid token role');

  const user = await User.findByPk(payload.sub);
  if (!user || user.status !== 1) throw ApiError.unauthorized('Account no longer active');

  const accessToken = signAccessToken({ sub: user.id, role: 'publisher' });
  return { accessToken, user: publicUser(user) };
}

// ---------------------------------------------------------------------------
// Publisher: forgot / reset password
// ---------------------------------------------------------------------------
async function requestPasswordReset(email) {
  const cleanEmail = sanitize(email).toLowerCase();
  const user = await User.findOne({ where: { email: cleanEmail } });
  // Always return the same message whether or not the email exists, to
  // avoid leaking which emails are registered.
  const genericResult = { message: 'If that email is registered, a reset link has been sent.' };
  if (!user) return genericResult;

  const token = randomHex(64);
  user.resetToken = token;
  user.resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const site = await getSiteConfig();
  const siteName = site?.siteName || 'GiftReward';
  const resetLink = `${env.frontendUrl}/publisher/reset-password?token=${token}`;

  const html = renderTemplate('forgot_password', {
    subject: `Reset Your Password - ${siteName}`,
    name: user.name,
    company_name: siteName,
    reset_link: resetLink,
    year: new Date().getFullYear(),
  });

  try {
    await sendMail({ to: user.email, subject: `Reset Your Password - ${siteName}`, html });
  } catch (err) {
    logger.error('Failed to send password reset email', { message: err.message });
  }

  return genericResult;
}

async function verifyResetToken(token) {
  const cleanToken = sanitize(token);
  const user = await User.findOne({
    where: { resetToken: cleanToken, resetExpires: { [Op.gt]: new Date() } },
  });
  return { valid: !!user };
}

async function resetPassword({ token, password }) {
  const cleanToken = sanitize(token);
  const user = await User.scope('withPassword').findOne({
    where: { resetToken: cleanToken, resetExpires: { [Op.gt]: new Date() } },
  });
  if (!user) throw ApiError.badRequest('Invalid or expired token. Please request a new reset link.');

  user.password = await bcrypt.hash(sanitize(password), 10);
  user.resetToken = null;
  user.resetExpires = null;
  await user.save();

  return { message: 'Your password has been reset successfully.' };
}

// ---------------------------------------------------------------------------
// Admin: login
// ---------------------------------------------------------------------------
async function loginAdmin({ email, password }) {
  const cleanEmail = sanitize(email).toLowerCase();
  const admin = await Admin.findOne({ where: { email: cleanEmail } });
  if (!admin) throw ApiError.unauthorized('Invalid credentials');

  // FIX (quirks.md): legacy compared plaintext. admins.password now holds a
  // bcrypt hash (see scripts/seedAdmin.js) and we verify with bcrypt here.
  const ok = await bcrypt.compare(password, admin.password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const accessToken = signAccessToken({ sub: admin.id, role: 'admin' });
  const refreshToken = signRefreshToken({ sub: admin.id, role: 'admin' });

  return { accessToken, refreshToken, user: publicAdmin(admin) };
}

async function refreshAdminToken(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Missing refresh token');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  if (payload.role !== 'admin') throw ApiError.unauthorized('Invalid token role');

  const admin = await Admin.findByPk(payload.sub);
  if (!admin) throw ApiError.unauthorized('Admin no longer exists');

  const accessToken = signAccessToken({ sub: admin.id, role: 'admin' });
  return { accessToken, user: publicAdmin(admin) };
}

module.exports = {
  registerPublisher,
  verifyPublisherEmail,
  loginPublisher,
  refreshPublisherToken,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  loginAdmin,
  refreshAdminToken,
  publicUser,
  publicAdmin,
};
