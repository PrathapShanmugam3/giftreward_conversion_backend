const asyncHandler = require('../utils/asyncHandler');
const reportAdminService = require('../services/reportAdmin.service');
const exportFormatService = require('../services/exportFormat.service');
const ApiError = require('../utils/ApiError');

const CLICK_EXPORT_COLUMNS = [
  { key: 'tracking_id', label: 'Click ID' },
  { key: 'publisher_name', label: 'Publisher' },
  { key: 'offer_name', label: 'Offer' },
  { key: 'click_time', label: 'Click Time' },
  { key: 'conversion_status', label: 'Status' },
  { key: 'payout', label: 'Payout' },
  { key: 'conversion_time', label: 'Conversion Time' },
  { key: 'ip', label: 'IP' },
];

function toExportRows(clicks) {
  const headers = CLICK_EXPORT_COLUMNS.map((c) => c.label);
  const rows = clicks.map((click) => {
    const clickTime = new Date(click.click_time).getTime();
    const convTime = click.conversion_time ? new Date(click.conversion_time).getTime() : null;
    const diffMs = convTime ? convTime - clickTime : null;
    const timeToConvert = diffMs
      ? `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`
      : '-';

    const row = {};
    row['Click ID'] = click.tracking_id;
    row['Publisher'] = click.publisher_name;
    row['Offer'] = click.offer_name;
    row['Click Time'] = click.click_time;
    row['Status'] = click.conversion_status ? click.conversion_status[0].toUpperCase() + click.conversion_status.slice(1) : 'Not converted';
    row['Payout'] = click.payout != null ? `₹${click.payout}` : '-';
    row['Conversion Time'] = click.conversion_time || '-';
    row['Time to Convert'] = timeToConvert;
    row['IP'] = click.ip;
    return row;
  });
  return { headers: [...headers.slice(0, 6), 'Time to Convert', 'IP'], rows };
}

const getReport = asyncHandler(async (req, res) => {
  const { start_date: startDate, end_date: endDate, publisher_id: publisherId, offer_id: offerId, status_filter: statusFilter } = req.query;
  const result = await reportAdminService.getAdminReport({ startDate, endDate, publisherId, offerId, statusFilter });
  res.json({ success: true, ...result });
});

const exportReport = asyncHandler(async (req, res) => {
  const { format = 'csv', start_date: startDate, end_date: endDate, publisher_id: publisherId, offer_id: offerId, status_filter: statusFilter } = req.query;
  if (!['csv', 'excel'].includes(format)) throw ApiError.badRequest('Invalid export format');

  const { clicks } = await reportAdminService.getAdminReport({ startDate, endDate, publisherId, offerId, statusFilter });
  const { headers, rows } = toExportRows(clicks);
  const filename = `Click_Report_${new Date().toISOString().slice(0, 10)}`;

  if (format === 'csv') {
    const csv = exportFormatService.toCsv(headers, rows);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  }

  const buffer = await exportFormatService.toExcelBuffer(headers, rows, 'Clicks');
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  return res.send(Buffer.from(buffer));
});

const getCampaignStats = asyncHandler(async (req, res) => {
  const { start_date: startDate, end_date: endDate, offer_id: offerId } = req.query;
  const result = await reportAdminService.getAdminCampaignStats({ startDate, endDate, offerId });
  res.json({ success: true, ...result });
});

module.exports = { getReport, exportReport, getCampaignStats };
