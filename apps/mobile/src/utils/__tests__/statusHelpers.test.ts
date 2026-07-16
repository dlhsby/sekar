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
  activityPill,
  overtimePill,
  presencePill,
  deriveAxes,
  userAxes,
  presenceActivityPill,
  locationLabel,
  pruningPill,
  getPruningRequestStatusColor,
  getPruningRequestStatusLabel,
} from '../statusHelpers';
import type { PruningRequestStatus } from '../../types/models.types';
import type { StatusTone } from '../../components/home/StatusPill';

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

    it('returns Menunggu Persetujuan for pending', () => {
      expect(getActivityStatusLabel('pending')).toBe('Menunggu Persetujuan');
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
    it('returns primary for completed', () => {
      expect(getTaskStatusColor('completed')).toBe('primary');
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

    it('returns success for verified', () => {
      expect(getTaskStatusColor('verified')).toBe('success');
    });

    it('returns success for accepted', () => {
      expect(getTaskStatusColor('accepted')).toBe('success');
    });

    it('returns warning for assigned', () => {
      expect(getTaskStatusColor('assigned')).toBe('warning');
    });

    it('returns warning for revision_needed', () => {
      expect(getTaskStatusColor('revision_needed')).toBe('warning');
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

  // ─── activityPill (StatusPill tone + label) ─────────────────────────────────

  describe('activityPill', () => {
    it('maps approved → ok / Disetujui', () => {
      expect(activityPill('approved')).toEqual({ tone: 'ok', label: 'Disetujui' });
    });

    it('maps pending → warn / Menunggu', () => {
      expect(activityPill('pending')).toEqual({ tone: 'warn', label: 'Menunggu' });
    });

    it('maps rejected → bad / Ditolak', () => {
      expect(activityPill('rejected')).toEqual({ tone: 'bad', label: 'Ditolak' });
    });

    it('maps undefined → neutral / Tercatat', () => {
      expect(activityPill(undefined)).toEqual({ tone: 'neutral', label: 'Tercatat' });
    });

    it('maps an unknown status → neutral / Tercatat (default)', () => {
      expect(activityPill('weird' as any)).toEqual({ tone: 'neutral', label: 'Tercatat' });
    });
  });

  // ─── overtimePill (StatusPill tone + label) ─────────────────────────────────

  describe('overtimePill', () => {
    it('maps approved → ok / Disetujui', () => {
      expect(overtimePill('approved')).toEqual({ tone: 'ok', label: 'Disetujui' });
    });

    it('maps rejected → bad / Ditolak', () => {
      expect(overtimePill('rejected')).toEqual({ tone: 'bad', label: 'Ditolak' });
    });

    it('maps pending → warn / Menunggu', () => {
      expect(overtimePill('pending')).toEqual({ tone: 'warn', label: 'Menunggu' });
    });

    it('maps an unknown status → warn / Menunggu (default)', () => {
      expect(overtimePill('weird' as any)).toEqual({ tone: 'warn', label: 'Menunggu' });
    });
  });

  // ─── presencePill (Monitoring) ──────────────────────────────────────────────
  //
  // Hi-fi vocab — different from getStatusLabel in utils/mapUtils.ts, which
  // still backs markers/overlays with the older "Idle / Di Luar Area" labels.
  // The pill version is used on the supervisor's MON-2 sheet + status bar.

  describe('presencePill', () => {
    it.each([
      ['active',   'ok',      'Aktif'],
      ['offline',  'neutral', 'Offline'],
      ['absent',   'bad',     'Tidak Hadir'],
    ] as const)('maps %s → %s / %s', (status, tone, label) => {
      expect(presencePill(status as any)).toEqual({ tone, label });
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

  // ─── Two-axis presence (CP6) ───────────────────────────────────────────────

  describe('deriveAxes', () => {
    it('maps active → aktif, location from is_within_area', () => {
      expect(deriveAxes('active', true)).toEqual({ activity: 'aktif', location: 'dalam_area' });
      expect(deriveAxes('active', false)).toEqual({ activity: 'aktif', location: 'luar_area' });
    });
    it('maps offline → offline, still reporting the LAST KNOWN inside/outside', () => {
      // Both aktif and offline carry the location axis (mirrors the backend's
      // calculateAxes). An unreachable worker's last known position is the whole
      // point — without it, offline would be indistinguishable from absent.
      expect(deriveAxes('offline', true)).toEqual({ activity: 'offline', location: 'dalam_area' });
      expect(deriveAxes('offline', false)).toEqual({ activity: 'offline', location: 'luar_area' });
    });
    it('maps absent → absent/unknown location regardless of is_within_area', () => {
      expect(deriveAxes('absent', true)).toEqual({ activity: 'absent', location: 'unknown' });
      expect(deriveAxes('absent', false)).toEqual({ activity: 'absent', location: 'unknown' });
    });
  });

  describe('userAxes', () => {
    it('prefers explicit backend fields when present', () => {
      expect(
        userAxes({ status: 'active', activity: 'absent', location: 'luar_area', is_within_area: true }),
      ).toEqual({ activity: 'absent', location: 'luar_area' });
    });
    it('falls back to deriveAxes when the fields are absent', () => {
      expect(userAxes({ status: 'active', is_within_area: false })).toEqual({
        activity: 'aktif',
        location: 'luar_area',
      });
    });
  });

  describe('presenceActivityPill', () => {
    it('maps each activity to a tone + label', () => {
      expect(presenceActivityPill('aktif')).toEqual({ tone: 'ok', label: 'Aktif' });
      expect(presenceActivityPill('offline')).toEqual({ tone: 'neutral', label: 'Offline' });
      expect(presenceActivityPill('absent')).toEqual({ tone: 'bad', label: 'Tidak Hadir' });
    });
  });

  describe('locationLabel', () => {
    it('labels each location', () => {
      expect(locationLabel('dalam_area')).toBe('Dalam area');
      expect(locationLabel('luar_area')).toBe('Luar area');
      expect(locationLabel('unknown')).toBe('—');
    });
  });

  // ─── Pruning request status (8 statuses) ────────────────────────────────────

  const ALL_PRUNING_STATUSES: PruningRequestStatus[] = [
    'submitted', 'under_review', 'approved', 'rejected',
    'assigned', 'in_progress', 'done', 'cancelled',
  ];

  describe('pruningPill', () => {
    const cases: Array<[PruningRequestStatus, StatusTone, string]> = [
      ['submitted',    'warn',    'Menunggu'],
      ['under_review', 'info',    'Direview'],
      ['approved',     'ok',      'Disetujui'],
      ['rejected',     'bad',     'Ditolak'],
      ['assigned',     'info',    'Ditugaskan'],
      ['in_progress',  'info',    'Diproses'],
      ['done',         'ok',      'Selesai'],
      ['cancelled',    'neutral', 'Dibatalkan'],
    ];

    test.each(cases)('maps %s → { tone: %s, label: %s }', (status, tone, label) => {
      expect(pruningPill(status)).toEqual({ tone, label });
    });

    it('keeps tone within the StatusTone vocabulary for every status', () => {
      const allowed: StatusTone[] = ['ok', 'warn', 'bad', 'info', 'neutral'];
      ALL_PRUNING_STATUSES.forEach((status) => {
        expect(allowed).toContain(pruningPill(status).tone);
      });
    });

    it('falls back to neutral + the canonical label for an unknown status', () => {
      expect(pruningPill('weird' as any)).toEqual({ tone: 'neutral', label: 'weird' });
    });
  });

  describe('getPruningRequestStatusColor', () => {
    const cases: Array<[PruningRequestStatus, string]> = [
      ['submitted', 'warning'],
      ['under_review', 'navy'],
      ['approved', 'success'],
      ['rejected', 'danger'],
      ['assigned', 'primary'],
      ['in_progress', 'primary'],
      ['done', 'success'],
      ['cancelled', 'gray'],
    ];
    test.each(cases)('maps %s → %s', (status, color) => {
      expect(getPruningRequestStatusColor(status)).toBe(color);
    });
  });

  describe('getPruningRequestStatusLabel', () => {
    const cases: Array<[PruningRequestStatus, string]> = [
      ['submitted', 'Menunggu'],
      ['under_review', 'Direview'],
      ['approved', 'Disetujui'],
      ['rejected', 'Ditolak'],
      ['assigned', 'Ditugaskan'],
      ['in_progress', 'Diproses'],
      ['done', 'Selesai'],
      ['cancelled', 'Dibatalkan'],
    ];
    test.each(cases)('maps %s → %s', (status, label) => {
      expect(getPruningRequestStatusLabel(status)).toBe(label);
    });
  });
});
