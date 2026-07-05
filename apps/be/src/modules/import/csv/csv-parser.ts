/** A parsed CSV: ordered headers plus one record per data row. */
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Split CSV text into records, honouring RFC 4180 quoting (quoted fields may
 * contain commas, newlines, and escaped `""` quotes). Returns one string array
 * per line.
 */
function tokenize(content: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  // Normalize line endings and strip a leading UTF-8 BOM.
  const text = content.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

/**
 * Parse CSV content into headers + row objects. Blank lines are ignored; values
 * are trimmed. Throws when the file has no header row.
 */
export function parseCsv(content: string): ParsedCsv {
  const records = tokenize(content).filter((r) => r.some((cell) => cell.trim() !== ''));
  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1).map((record) => {
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (record[idx] ?? '').trim();
    });
    return row;
  });

  return { headers, rows };
}
