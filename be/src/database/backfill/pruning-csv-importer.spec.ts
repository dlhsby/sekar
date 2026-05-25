/**
 * Unit tests for the CSV backfill scaffold (Phase 3 sub-phase 3-13).
 * Covers the pure parsing helpers — the database-touching `main` flow is
 * verified by running the importer in dry-run mode against the real CSV.
 */

import { parseIndoDate, rowFromCsv, parseLine } from './pruning-csv-importer';

describe('Pruning CSV importer — pure helpers', () => {
  describe('parseLine', () => {
    it('splits a simple CSV line on commas and trims cells', () => {
      const out = parseLine('a, b , c,,d');
      expect(out).toEqual(['a', 'b', 'c', '', 'd']);
    });
  });

  describe('parseIndoDate', () => {
    it('parses DD/MM/YYYY HH:MM:SS into a UTC Date', () => {
      const d = parseIndoDate('01/01/2026 7:21:23');
      expect(d).not.toBeNull();
      expect(d!.getUTCFullYear()).toBe(2026);
      expect(d!.getUTCMonth()).toBe(0);
      expect(d!.getUTCDate()).toBe(1);
      expect(d!.getUTCHours()).toBe(7);
      expect(d!.getUTCMinutes()).toBe(21);
    });

    it('parses date-only DD/MM/YYYY (work date column)', () => {
      const d = parseIndoDate('31/12/2025');
      expect(d).not.toBeNull();
      expect(d!.getUTCFullYear()).toBe(2025);
      expect(d!.getUTCMonth()).toBe(11);
      expect(d!.getUTCDate()).toBe(31);
    });

    it('returns null for garbage input', () => {
      expect(parseIndoDate('not a date')).toBeNull();
      expect(parseIndoDate('')).toBeNull();
      expect(parseIndoDate('2026-01-01')).toBeNull(); // ISO not supported on purpose
    });
  });

  describe('rowFromCsv', () => {
    // Header order from the real CSV (2026-05-23):
    // 0 Timestamp, 1 reference, 2 Tanggal, 3 Rayon, 4 Lokasi, 5 Pohon,
    // 6 Jumlah, 7 Penanganan(empty), 8 Keterangan Lokasi, 9 Penanganan(case),
    // 10 Waktu Laporan, 11 Waktu Penanganan, 12 Foto Sebelum, 13 Foto Sesudah,
    // 14 Taruna, 15 Penyebab Tumbang, 16 Keterangan.
    const sample = [
      '01/01/2026 7:21:23',
      '25PR1',
      '31/12/2025',
      'Timur 1',
      'KUTISARI INDAH UTARA RT02 RW06',
      'SONO',
      '4',
      '',
      '',
      'GT',
      '',
      '',
      '',
      '',
      'PW',
      '',
      '',
    ];

    it('maps a well-formed row', () => {
      const row = rowFromCsv(sample, 2);
      expect(row).not.toBeNull();
      expect(row!.referenceCode).toBe('25PR1');
      expect(row!.rayonName).toBe('Timur 1');
      expect(row!.speciesName).toBe('SONO');
      expect(row!.count).toBe(4);
      expect(row!.caseType).toBe('GT');
      expect(row!.source).toBe('PW');
    });

    it('rejects rows missing reference_code', () => {
      const r = [...sample];
      r[1] = '';
      expect(rowFromCsv(r, 3)).toBeNull();
    });

    it('rejects rows missing rayon', () => {
      const r = [...sample];
      r[3] = '';
      expect(rowFromCsv(r, 4)).toBeNull();
    });

    it('rejects rows missing species', () => {
      const r = [...sample];
      r[5] = '';
      expect(rowFromCsv(r, 5)).toBeNull();
    });

    it('rejects rows with NaN jumlah', () => {
      const r = [...sample];
      r[6] = 'banyak';
      expect(rowFromCsv(r, 6)).toBeNull();
    });

    it('rejects truncated rows (fewer than 17 columns)', () => {
      expect(rowFromCsv(sample.slice(0, 10), 7)).toBeNull();
    });
  });
});
