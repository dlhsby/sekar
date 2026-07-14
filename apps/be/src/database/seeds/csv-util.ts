/**
 * Shared CSV + deterministic-id helpers for the seed-data tooling
 * (load-seed-data, sheet-sync, export-seed-ids).
 */
import * as crypto from 'crypto';

/** Minimal RFC-4180 parser: quoted fields, embedded commas, `""` escapes, CRLF. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parse CSV text into header-keyed, trimmed records (blank rows skipped). */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h.trim()] = (r[i] ?? '').trim()));
    return rec;
  });
}

/** Quote a CSV cell only when it contains a comma, quote, or newline. */
export function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Serialize rows (header first) to CSV text with a trailing newline. */
export function serializeCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

/** Deterministic UUID v5 (SHA-1). Same algorithm as the KMZ extractor. */
export function uuidv5(name: string, namespace: string): string {
  const h = crypto.createHash('sha1');
  h.update(Buffer.from(namespace.replace(/-/g, ''), 'hex'));
  h.update(Buffer.from(name, 'utf8'));
  const b = h.digest().subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const x = Buffer.from(b).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
