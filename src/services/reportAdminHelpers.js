// Shared by report.service.js (publisher) and reportAdmin.service.js (admin):
// both legacy reports pages supported status_filter = converted |
// not_converted | <conversion status>, applied against a `cv` alias for
// the LEFT JOINed conversions table.
function buildStatusFilterAdmin(status, paramsOut) {
  if (!status || status === 'all') return '';
  if (status === 'converted') return ' AND cv.id IS NOT NULL';
  if (status === 'not_converted') return ' AND cv.id IS NULL';
  paramsOut.push(status);
  return ' AND cv.status = ?';
}

module.exports = { buildStatusFilterAdmin };
