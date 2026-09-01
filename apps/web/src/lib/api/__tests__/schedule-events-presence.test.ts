/**
 * The presence axes must survive the trip from the API into `ScheduleOccurrence`.
 *
 * This is the exact gap that made ADR-050 dead on the Jadwal board:
 * `ScheduleOccurrence` DECLARED `lifecycle_state` / `leave_reason` /
 * `is_within_area` / `is_scheduled`, the board read them, and `toOccurrence`
 * never mapped a single one — so every consumer silently fell back to `status`
 * and five of the nine tones were unreachable. Because the type declared them,
 * it read as implemented. A test at this seam is what stops that recurring.
 */
import { toOccurrence, type RawScheduleRangeRow } from '../schedule-events';

const raw = (over: Partial<RawScheduleRangeRow> = {}): RawScheduleRangeRow =>
  ({
    id: 'r1',
    user_id: 'u1',
    schedule_date: '2026-07-27',
    shift_definition_id: 's1',
    status: 'present',
    user: { id: 'u1', full_name: 'Budi', username: 'budi', role: 'satgas' },
    ...over,
  }) as RawScheduleRangeRow;

describe('toOccurrence — presence axes', () => {
  it('maps all four axes through', () => {
    const o = toOccurrence(
      raw({
        lifecycle_state: 'bertugas',
        lifecycle_flags: ['is_late'],
        leave_reason: null,
        is_within_area: false,
        is_scheduled: true,
      }),
    );
    expect(o.lifecycle_state).toBe('bertugas');
    expect(o.lifecycle_flags).toEqual(['is_late']);
    expect(o.is_within_area).toBe(false);
    expect(o.is_scheduled).toBe(true);
  });

  it('preserves a leave reason, so an excused absence never reads as a no-show', () => {
    const o = toOccurrence(raw({ status: 'leave_sick', leave_reason: 'sakit' }));
    expect(o.leave_reason).toBe('sakit');
  });

  it('distinguishes an ad-hoc worker (is_scheduled false) from a rostered one', () => {
    expect(toOccurrence(raw({ is_scheduled: false })).is_scheduled).toBe(false);
  });

  it('defaults a future row to null lifecycle and scheduled=true', () => {
    // The backend omits the axes for rows it did not derive. `null` must mean
    // "not applicable", and the row must NOT be mistaken for ad-hoc.
    const o = toOccurrence(raw({ schedule_date: '2026-09-01', status: 'planned' }));
    expect(o.lifecycle_state).toBeNull();
    expect(o.lifecycle_flags).toEqual([]);
    expect(o.is_within_area).toBeNull();
    expect(o.is_scheduled).toBe(true);
  });

  it('keeps false and null distinct on is_within_area', () => {
    // `false` = on duty OUTSIDE the area (amber). `null` = no live reading
    // (neutral). Collapsing them with `|| null` would erase the amber case.
    expect(toOccurrence(raw({ is_within_area: false })).is_within_area).toBe(false);
    expect(toOccurrence(raw({ is_within_area: null })).is_within_area).toBeNull();
  });
});
