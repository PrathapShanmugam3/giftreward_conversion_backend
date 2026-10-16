const asyncHandler = require('../utils/asyncHandler');
const reportService = require('../services/report.service');
const exportFormatService = require('../services/exportFormat.service');
const ApiError = require('../utils/ApiError');

function parseVisibleColumns(query) {
  if (!query.columns) return {};
  try {
    return typeof query.columns === 'string' ? JSON.parse(query.columns) : query.columns;
  } catch {
    return {};
  }
}

const getSummary = asyncHandler(async (req, res) => {
  const { type, dateFrom, dateTo, offerId, status } = req.query;
  const result = await reportService.getPublisherSummary(req.auth.sub, { type, dateFrom, dateTo, offerId, status });
  res.json({ success: true, ...result });
});

const getDetailed = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, offerId, status, page, perPage } = req.query;
  const result = await reportService.getPublisherDetailed(req.auth.sub, {
    dateFrom,
    dateTo,
    offerId,
    status,
    page: Number(page) || 1,
    perPage: Number(perPage) || 10,
  });
  res.json({
    success: true,
    ...result,
    columnLabels: reportService.COLUMN_LABELS,
    defaultVisibleColumns: reportService.DEFAULT_VISIBLE_COLUMNS,
  });
});

const exportReport = asyncHandler(async (req, res) => {
  const { format = 'csv', dateFrom, dateTo, offerId, status } = req.query;
  if (!['csv', 'excel', 'pdf'].includes(format)) throw ApiError.badRequest('Invalid export format');

  const visibleColumns = parseVisibleColumns(req.query);
  const { rows: clickRows } = await reportService.getPublisherDetailed(req.auth.sub, {
    dateFrom,
    dateTo,
    offerId,
    status,
    page: 1,
    perPage: 5000,
  });
  const { headers, rows } = await reportService.buildExportRows(clickRows, visibleColumns);

  const filename = `report_${new Date().toISOString().slice(0, 10)}`;

  if (format === 'csv') {
    const csv = exportFormatService.toCsv(headers, rows);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  }

  if (format === 'excel') {
    const buffer = await exportFormatService.toExcelBuffer(headers, rows);
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return res.send(Buffer.from(buffer));
  }

  // pdf
  const buffer = await exportFormatService.toPdfBuffer({
    title: 'Performance Report',
    subtitle: `${dateFrom || ''} to ${dateTo || ''}`,
    headers,
    rows,
  });
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  return res.send(buffer);
});

module.exports = { getSummary, getDetailed, exportReport };
