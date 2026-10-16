const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Real CSV, built from header/rows pairs produced by report.service.js.
function toCsv(headers, rows) {
  const parser = new Parser({ fields: headers, header: true });
  // json2csv expects objects keyed by field name; our rows are already
  // plain objects keyed by the same label strings as `headers` (see
  // buildExportRows / summary row shape), so no remapping needed.
  return parser.parse(rows);
}

// FIX (quirks.md): legacy "Excel" export was CSV with a .xlsx/.xls
// extension slapped on, not a real spreadsheet. This produces an actual
// .xlsx workbook via ExcelJS.
async function toExcelBuffer(headers, rows, sheetName = 'Report') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, h.length + 2) }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

// FIX (quirks.md): legacy PDF export required TCPDF at a hard-coded path
// from a different hosting account and was simply broken. This uses
// pdfkit, a real Node PDF library, to render an actual table.
function toPdfBuffer({ title, subtitle, headers, rows, summaryCards = [] }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: headers.length > 7 ? 'landscape' : 'portrait' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text(title, { align: 'center' });
    if (subtitle) doc.moveDown(0.3).fontSize(10).fillColor('#666').text(subtitle, { align: 'center' });
    doc.moveDown(1);

    if (summaryCards.length > 0) {
      doc.fillColor('#000').fontSize(10);
      const cardWidth = (doc.page.width - 72) / summaryCards.length;
      const startY = doc.y;
      summaryCards.forEach((card, i) => {
        doc.text(card.label, 36 + i * cardWidth, startY, { width: cardWidth, align: 'center' });
        doc.fontSize(13).text(String(card.value), 36 + i * cardWidth, startY + 14, { width: cardWidth, align: 'center' });
        doc.fontSize(10);
      });
      doc.y = startY + 40;
      doc.moveDown(1);
    }

    if (rows.length === 0) {
      doc.text('No data for the selected range.');
      doc.end();
      return;
    }

    const colWidth = (doc.page.width - 72) / headers.length;
    const rowHeight = 18;
    const drawRow = (values, y, isHeader) => {
      doc.fontSize(8).fillColor(isHeader ? '#fff' : '#000');
      if (isHeader) {
        doc.rect(36, y, doc.page.width - 72, rowHeight).fill('#2563eb');
        doc.fillColor('#fff');
      }
      values.forEach((v, i) => {
        doc.text(String(v ?? ''), 36 + i * colWidth + 2, y + 4, { width: colWidth - 4, height: rowHeight, ellipsis: true });
      });
      doc.fillColor('#000');
    };

    let y = doc.y;
    drawRow(headers, y, true);
    y += rowHeight;

    for (const row of rows) {
      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage();
        y = 40;
        drawRow(headers, y, true);
        y += rowHeight;
      }
      drawRow(headers.map((h) => row[h]), y, false);
      y += rowHeight;
    }

    doc.end();
  });
}

module.exports = { toCsv, toExcelBuffer, toPdfBuffer };
