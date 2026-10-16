const crypto = require('crypto');

// PHP bin2hex(random_bytes($length/2)) -> hex string of `length` chars.
function randomHex(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// PHP uniqid(): 13-char lowercase-hex, time-based, not cryptographically
// random. Click IDs in the wild follow this shape; new ones should too so
// format checks (^[a-zA-Z0-9_-]+$) and any length assumptions keep working.
function uniqid() {
  const sec = Math.floor(Date.now() / 1000);
  const usec = Math.floor((Date.now() % 1000) * 1000);
  return sec.toString(16).padStart(8, '0') + usec.toString(16).padStart(5, '0');
}

module.exports = { randomHex, uniqid };
