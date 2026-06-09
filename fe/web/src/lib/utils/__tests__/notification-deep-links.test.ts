import { notificationToRoute } from '../notification-deep-links';
import type { AppNotification } from '@/lib/api/notifications';

const make = (
  type: AppNotification['type'],
  data: Record<string, unknown> | null
): AppNotification => ({
  id: 'n1',
  user_id: 'u1',
  title: 't',
  body: 'b',
  type,
  data,
  is_read: false,
  read_at: null,
  created_at: '2026-06-09T00:00:00Z',
});

describe('notificationToRoute', () => {
  it('routes task notifications to the task detail', () => {
    expect(notificationToRoute(make('task_assigned', { task_id: 'abc' }))).toBe('/tasks/abc');
  });

  it('routes activity notifications (including tagged) to the activity detail', () => {
    expect(notificationToRoute(make('activity_approved', { activity_id: 'a1' }))).toBe(
      '/activities/a1'
    );
    expect(notificationToRoute(make('activity_tagged', { activity_id: 'a2' }))).toBe(
      '/activities/a2'
    );
  });

  it('routes overtime notifications to the overtime detail', () => {
    expect(notificationToRoute(make('overtime_approved', { overtime_id: 'o9' }))).toBe(
      '/overtime/o9'
    );
  });

  it('routes pruning notifications to the request detail', () => {
    expect(notificationToRoute(make('system', { pruning_request_id: 'pr1' }))).toBe(
      '/pruning-requests/pr1'
    );
  });

  it('focuses a missing worker on the monitoring map', () => {
    expect(notificationToRoute(make('missing_worker_alert', { worker_user_id: 'w1' }))).toBe(
      '/monitoring?focus=w1'
    );
    // Falls back to the plain monitoring route without an id.
    expect(notificationToRoute(make('missing_worker_alert', {}))).toBe('/monitoring');
  });

  it('routes shift reminders to the schedules page', () => {
    expect(notificationToRoute(make('shift_reminder', null))).toBe('/schedules');
  });

  it('returns null for generic announcements with no entity', () => {
    expect(notificationToRoute(make('announcement', null))).toBeNull();
    expect(notificationToRoute(make('system', {}))).toBeNull();
  });

  it('ignores non-string / empty ids', () => {
    expect(notificationToRoute(make('task_assigned', { task_id: '' }))).toBeNull();
    expect(notificationToRoute(make('task_assigned', { task_id: 123 }))).toBeNull();
  });
});
