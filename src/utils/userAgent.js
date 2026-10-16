// Mirrors publisher/reports.php's parseUserAgent(): crude substring checks,
// not a full UA parser, but that's what the legacy reports showed so we
// keep the same categorization for continuity in exported data.
function parseDevice(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  let device = 'Desktop';

  if (ua.includes('mobile')) device = 'Mobile';
  else if (ua.includes('tablet')) device = 'Tablet';

  if (ua.includes('android')) device += ' (Android)';
  else if (ua.includes('iphone') || ua.includes('ipad')) device += ' (iOS)';
  else if (ua.includes('windows')) device += ' (Windows)';
  else if (ua.includes('macintosh')) device += ' (Mac)';
  else if (ua.includes('linux')) device += ' (Linux)';

  return device;
}

module.exports = { parseDevice };
