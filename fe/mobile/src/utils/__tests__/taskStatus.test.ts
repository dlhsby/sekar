/**
 * taskStatus tests — ACTIVE_TASK_STATUSES + taskPill (all 8 statuses).
 */

import { ACTIVE_TASK_STATUSES, taskPill, isTaskScopedToday } from '../taskStatus';
import type { TaskStatus } from '../../types/models.types';

describe('ACTIVE_TASK_STATUSES', () => {
  it('contains only the actionable statuses', () => {
    expect(ACTIVE_TASK_STATUSES).toEqual([
      'pending',
      'assigned',
      'accepted',
      'in_progress',
      'revision_needed',
    ]);
  });
});

describe('taskPill', () => {
  const cases: Array<[TaskStatus, { tone: string; label: string }]> = [
    ['in_progress', { tone: 'ok', label: 'Berjalan' }],
    ['assigned', { tone: 'warn', label: 'Siap mulai' }],
    ['accepted', { tone: 'warn', label: 'Siap mulai' }],
    ['revision_needed', { tone: 'bad', label: 'Revisi' }],
    ['completed', { tone: 'info', label: 'Menunggu verifikasi' }],
    ['verified', { tone: 'ok', label: 'Terverifikasi' }],
    ['declined', { tone: 'bad', label: 'Ditolak' }],
    ['pending', { tone: 'neutral', label: 'Menunggu' }],
  ];

  test.each(cases)('maps %s correctly', (status, expected) => {
    expect(taskPill(status)).toEqual(expected);
  });

  it('falls back to neutral/Menunggu for an unknown status', () => {
    expect(taskPill('weird' as any)).toEqual({ tone: 'neutral', label: 'Menunggu' });
  });
});

// ─── isTaskScopedToday ────────────────────────────────────────────────────────
//
// Used identically by Home (FieldHomeScreen.activeTasks) and the Monitoring
// user-detail sheet so counts on both surfaces always agree. A task qualifies
// if ANY of deadline / created_at / completed_at falls within today's local
// SOD→EOD window, regardless of status.

describe('isTaskScopedToday', () => {
  const todayMid = new Date();
  todayMid.setHours(12, 0, 0, 0);
  const today = todayMid.toISOString();

  const yesterday = new Date(todayMid);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = yesterday.toISOString();

  const tomorrow = new Date(todayMid);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString();

  it('returns true when deadline is today', () => {
    expect(isTaskScopedToday({ deadline: today })).toBe(true);
  });

  it('returns true when created_at is today', () => {
    expect(isTaskScopedToday({ created_at: today })).toBe(true);
  });

  it('returns true when completed_at is today', () => {
    expect(isTaskScopedToday({ completed_at: today })).toBe(true);
  });

  it('returns true if at least one date is today (others past/future)', () => {
    expect(isTaskScopedToday({
      created_at: yesterdayIso,
      deadline: today,
      completed_at: tomorrowIso,
    })).toBe(true);
  });

  it('returns false when no date field is set', () => {
    expect(isTaskScopedToday({})).toBe(false);
  });

  it('returns false when all dates fall before today', () => {
    expect(isTaskScopedToday({
      created_at: yesterdayIso,
      deadline: yesterdayIso,
      completed_at: yesterdayIso,
    })).toBe(false);
  });

  it('returns false when all dates fall after today', () => {
    expect(isTaskScopedToday({
      created_at: tomorrowIso,
      deadline: tomorrowIso,
    })).toBe(false);
  });

  it('ignores undefined date fields without throwing', () => {
    expect(isTaskScopedToday({
      created_at: undefined,
      deadline: undefined,
      completed_at: undefined,
    })).toBe(false);
  });

  it('matches the start-of-day boundary (00:00:00.000)', () => {
    const sod = new Date();
    sod.setHours(0, 0, 0, 0);
    expect(isTaskScopedToday({ created_at: sod.toISOString() })).toBe(true);
  });

  it('matches the end-of-day boundary (23:59:59.999)', () => {
    const eod = new Date();
    eod.setHours(23, 59, 59, 999);
    expect(isTaskScopedToday({ deadline: eod.toISOString() })).toBe(true);
  });
});
