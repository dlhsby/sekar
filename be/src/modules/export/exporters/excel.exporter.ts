import * as ExcelJS from 'exceljs';
import type { Dataset, ExportFile } from './dataset';
import { CONTENT_TYPES } from './dataset';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF7FBC8C' }, // sage primary (Design System v2.1)
};

/**
 * Serialize a {@link Dataset} to an XLSX workbook buffer via exceljs, with a
 * styled header row and auto-sized columns. Sheet name is capped at Excel's
 * 31-char limit.
 */
export async function toXlsx(dataset: Dataset, sheetName: string): Promise<ExportFile> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SEKAR';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName.slice(0, 31) || 'Export');

  sheet.columns = dataset.headers.map((header) => ({
    header,
    width: Math.min(Math.max(header.length + 4, 12), 50),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = HEADER_FILL;

  for (const row of dataset.rows) {
    sheet.addRow(row.map((cell) => cell ?? ''));
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: CONTENT_TYPES.xlsx,
    extension: 'xlsx',
  };
}
