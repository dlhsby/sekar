/**
 * taskStatus tests — ACTIVE_TASK_STATUSES + taskPill (all 8 statuses).
 */

import { ACTIVE_TASK_STATUSES, taskPill } from '../taskStatus';
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
