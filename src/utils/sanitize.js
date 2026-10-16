// Mirrors the legacy PHP sanitize(): htmlspecialchars(trim(data), ENT_QUOTES, 'UTF-8')
// then mysqli_real_escape_string. We use parameterized queries everywhere so
// the SQL-escaping half is unnecessary (and would double-escape), but the
// htmlspecialchars half is NOT optional for passwords: existing bcrypt
// hashes in `users.password` were computed from the htmlspecialchars'd
// password, not the raw one. New passwords must go through the same
// transform or old accounts become unloginable and new accounts would be
// inconsistent with them.
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#039;',
  '<': '&lt;',
  '>': '&gt;',
};

function htmlspecialchars(input) {
  return String(input).replace(/[&"'<>]/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

function sanitize(value) {
  return htmlspecialchars(String(value).trim());
}

module.exports = { sanitize, htmlspecialchars };
