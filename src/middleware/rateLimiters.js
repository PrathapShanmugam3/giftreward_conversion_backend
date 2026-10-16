const rateLimit = require('express-rate-limit');

// Generic API limiter — generous, just a backstop.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limiter for auth endpoints (login/register/forgot-password) on top
// of the DB-backed blocked_ips lockout, to blunt distributed brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

// Admin login has no account-level lockout (there is exactly one admin
// account, and locking it out on repeated guesses would itself be a denial
// of service against the real admin). The `blocked_ips` table can't be
// reused here either — it's keyed by IP only with no scope column, so a
// failed publisher login and a failed admin login from the same office IP
// would share one lockout row, locking each other out. This dedicated,
// tighter, in-memory-only limiter is the proportionate fix: far fewer
// attempts allowed than the generic authLimiter, isolated to this one route.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// /go is a publisher's real tracking link, legitimately hit by actual ad
// traffic (page loads, not scripted abuse) at a much higher volume than
// the authenticated API ever sees — generous ceiling, still bounds a
// runaway bot/scraper.
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

// /postback is called by advertiser servers, not browsers — same per-IP
// ceiling idea but keyed to server-to-server traffic patterns (bursty,
// not sustained like /go page loads).
const postbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please slow down.',
});

// /tracking is a public UPI lookup with no auth — without a limiter this
// is an open enumeration tool for scraping UPI->offer/status data at
// volume. Tighter than the others since there's no legitimate reason for
// one IP to hit this often.
const publicLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

module.exports = { apiLimiter, authLimiter, adminLoginLimiter, trackingLimiter, postbackLimiter, publicLookupLimiter };
