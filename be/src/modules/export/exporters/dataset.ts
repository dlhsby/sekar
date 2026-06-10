import type { ExportFormat } from '../entities/export-job.entity';

/** A single cell value in an export row. */
export type CellValue = string | number | boolean | null | undefined;

/** A flat, format-agnostic tabular dataset ready for serialization. */
export interface Dataset {
  headers: string[];
  rows: CellValue[][];
}

/** Generated file payload returned by an exporter. */
export interface ExportFile {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

export const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  kmz: 'application/vnd.google-earth.kmz',
};
