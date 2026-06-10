import type { CellValue, Dataset, ExportFile } from './dataset';
import { CONTENT_TYPES } from './dataset';

/**
 * Escape a single CSV field per RFC 4180: wrap in quotes when it contains a
 * comma, quote, or newline, doubling any embedded quotes.
 */
function escapeField(value: CellValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toLine(cells: CellValue[]): string {
  return cells.map(escapeField).join(',');
}

/**
 * Serialize a {@link Dataset} to a UTF-8 CSV buffer. A BOM is prepended so
 * Excel renders Indonesian/UTF-8 characters correctly.
 */
export function toCsv(dataset: Dataset): ExportFile {
  const lines = [toLine(dataset.headers), ...dataset.rows.map(toLine)];
  const body = `﻿${lines.join('\r\n')}`;
  return {
    buffer: Buffer.from(body, 'utf-8'),
    contentType: CONTENT_TYPES.csv,
    extension: 'csv',
  };
}
