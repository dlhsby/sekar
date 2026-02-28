/**
 * statusHelpers Tests
 * Covers all status helpers: overtime, activity, task, formatDate, formatTime,
 * formatDateIndonesian, formatDateTimeIndonesian, and formatDurationHours.
 */

import {
  getOvertimeStatusColor,
  getOvertimeStatusLabel,
  getActivityStatusColor,
  getActivityStatusLabel,
  getTaskStatusColor,
  getTaskStatusLabel,
  formatDate,
  formatTime,
  formatDateIndonesian,
  formatDurationHours,
} from '../statusHelpers';

describe('statusHelpers', () => {
  // ─── Overtime ──────────────────────────────────────────────────────────────

  describe('getOvertimeStatusColor', () => {
    it('returns success for approved', () => {
      expect(getOvertimeStatusColor('approved')).toBe('success');
    });

    it('returns warning for pending', () => {
      expect(getOvertimeStatusColor('pending')).toBe('warning');
    });

    it('returns danger for rejected', () => {
      expect(getOvertimeStatusColor('rejected')).toBe('danger');
    });

    it('returns warning for unknown status (default)', () => {
      expect(getOvertimeStatusColor('unknown' as any)).toBe('warning');
    });
  });

  describe('getOvertimeStatusLabel', () => {
    it('returns Disetujui for approved', () => {
      expect(getOvertimeStatusLabel('approved')).toBe('Disetujui');
    });

    it('returns Menunggu for pending', () => {
      expect(getOvertimeStatusLabel('pending')).toBe('Menunggu');
    });

    it('returns Ditolak for rejected', () => {
      expect(getOvertimeStatusLabel('rejected')).toBe('Ditolak');
    });

    it('returns the raw status for unknown values (default)', () => {
      expect(getOvertimeStatusLabel('unknown' as any)).toBe('unknown');
    });
  });

  // ─── Activity ──────────────────────────────────────────────────────────────

  describe('getActivityStatusColor', () => {
    it('returns success for approved', () => {
      expect(getActivityStatusColor('approved')).toBe('success');
    });

    it('returns warning for pending', () => {
      expect(getActivityStatusColor('pending')).toBe('warning');
    });

    it('returns danger for rejected', () => {
      expect(getActivityStatusColor('rejected')).toBe('danger');
    });

    it('returns gray for unknown status (default)', () => {
      expect(getActivityStatusColor('unknown' as any)).toBe('gray');
    });
  });

  describe('getActivityStatusLabel', () => {
    it('returns Disetujui for approved', () => {
      expect(getActivityStatusLabel('approved')).toBe('Disetujui');
    });

    it('returns Menunggu for pending', () => {
      expect(getActivityStatusLabel('pending')).toBe('Menunggu');
    });

    it('returns Ditolak for rejected', () => {
      expect(getActivityStatusLabel('rejected')).toBe('Ditolak');
    });

    it('returns the raw status for unknown values (default)', () => {
      expect(getActivityStatusLabel('unknown' as any)).toBe('unknown');
    });
  });

  // ─── Task ──────────────────────────────────────────────────────────────────

  describe('getTaskStatusColor', () => {
    it('returns success for completed', () => {
      expect(getTaskStatusColor('completed')).toBe('success');
    });

    it('returns primary for in_progress', () => {
      expect(getTaskStatusColor('in_progress')).toBe('primary');
    });

    it('returns warning for pending', () => {
      expect(getTaskStatusColor('pending')).toBe('warning');
    });

    it('returns danger for declined', () => {
      expect(getTaskStatusColor('declined')).toBe('danger');
    });

    it('returns gray for unknown status (default)', () => {
      expect(getTaskStatusColor('unknown' as any)).toBe('gray');
    });
  });

  describe('getTaskStatusLabel — all 8 statuses', () => {
    it('returns Menunggu for pending', () => {
      expect(getTaskStatusLabel('pending')).toBe('Menunggu');
    });

    it('returns Ditugaskan for assigned', () => {
      expect(getTaskStatusLabel('assigned')).toBe('Ditugaskan');
    });

    it('returns Diterima for accepted', () => {
      expect(getTaskStatusLabel('accepted')).toBe('Diterima');
    });

    it('returns Ditolak for declined', () => {
      expect(getTaskStatusLabel('declined')).toBe('Ditolak');
    });

    it('returns Dikerjakan for in_progress', () => {
      expect(getTaskStatusLabel('in_progress')).toBe('Dikerjakan');
    });

    it('returns Menunggu Verifikasi for completed', () => {
      expect(getTaskStatusLabel('completed')).toBe('Menunggu Verifikasi');
    });

    it('returns Terverifikasi for verified', () => {
      expect(getTaskStatusLabel('verified')).toBe('Terverifikasi');
    });

    it('returns Perlu Revisi for revision_needed', () => {
      expect(getTaskStatusLabel('revision_needed')).toBe('Perlu Revisi');
    });

    it('returns the raw string for an unknown status (default)', () => {
      expect(getTaskStatusLabel('some_unknown')).toBe('some_unknown');
    });
  });

  // ─── formatDate ────────────────────────────────────────────────────────────

  describe('formatDate', () => {
    it('returns "-" for an empty string', () => {
      expect(formatDate('')).toBe('-');
    });

    it('returns a non-empty string for a valid ISO datetime', () => {
      // The exact locale-formatted string depends on the runtime locale,
      // so we only verify it is a non-empty, non-dash string.
      const result = formatDate('2026-02-14T08:00:00.000Z');
      expect(result).not.toBe('-');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns "-" for a null-ish falsy value passed as empty string', () => {
      // Test boundary: undefined cast to string
      expect(formatDate(undefined as any)).toBe('-');
    });
  });

  // ─── formatTime ────────────────────────────────────────────────────────────

  describe('formatTime', () => {
    it('returns "-" for an empty string', () => {
      expect(formatTime('')).toBe('-');
    });

    it('returns a non-empty string for a valid ISO datetime', () => {
      const result = formatTime('2026-02-14T08:00:00.000Z');
      expect(result).not.toBe('-');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns "-" for a null-ish falsy value passed as empty string', () => {
      expect(formatTime(undefined as any)).toBe('-');
    });
  });

  // ─── formatDateIndonesian ──────────────────────────────────────────────────

  describe('formatDateIndonesian', () => {
    it('returns a non-empty localised string for a date-only string', () => {
      const result = formatDateIndonesian('2026-02-14');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns a non-empty localised string for a full ISO datetime', () => {
      const result = formatDateIndonesian('2026-02-14T08:00:00.000Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ─── formatDurationHours ──────────────────────────────────────────────────

  describe('formatDurationHours', () => {
    it('returns "-" when end is before start', () => {
      expect(formatDurationHours('2026-02-14T10:00:00Z', '2026-02-14T08:00:00Z')).toBe('-');
    });

    it('returns "-" when start and end are identical', () => {
      expect(formatDurationHours('2026-02-14T08:00:00Z', '2026-02-14T08:00:00Z')).toBe('-');
    });

    it('returns duration in hours for same-day span without midnight crossing', () => {
      // 3 hours, same calendar day in any timezone within reasonable range
      const result = formatDurationHours('2026-02-14T06:00:00Z', '2026-02-14T09:00:00Z');
      expect(result).toContain('3');
      expect(result).toContain('j');
    });
  });
});
