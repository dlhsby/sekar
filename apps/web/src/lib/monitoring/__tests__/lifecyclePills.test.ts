import { lifecycleFlagPills, lifecycleStatePill } from '../lifecyclePills';

describe('lifecycleFlagPills', () => {
  it('honours the BOOLEAN sources, not just the flags array', () => {
    // The defect this fixes: web read only `lifecycle_flags`, so a payload
    // carrying `is_late` / `is_scheduled` as booleans showed no pill at all —
    // while mobile, reading both, showed them. Same worker, two readings.
    expect(lifecycleFlagPills({ is_late: true }).map((p) => p.labelKey)).toEqual([
      'monitoring:lifecycle.late',
    ]);
    expect(lifecycleFlagPills({ is_scheduled: false }).map((p) => p.labelKey)).toEqual([
      'monitoring:lifecycle.luarJadwal',
    ]);
  });

  it('honours the flags array too', () => {
    expect(lifecycleFlagPills({ lifecycle_flags: ['is_late', 'ad_hoc'] }).map((p) => p.labelKey)).toEqual([
      'monitoring:lifecycle.late',
      'monitoring:lifecycle.luarJadwal',
    ]);
  });

  it('does not duplicate when a flag arrives by both routes', () => {
    expect(lifecycleFlagPills({ is_late: true, lifecycle_flags: ['is_late'] })).toHaveLength(1);
  });

  it('keeps a fixed order: late → luar jadwal → lembur → lupa clock-out', () => {
    const pills = lifecycleFlagPills({
      lifecycle_flags: ['lupa_clock_out', 'lembur', 'ad_hoc', 'is_late'],
    });
    expect(pills.map((p) => p.labelKey)).toEqual([
      'monitoring:lifecycle.late',
      'monitoring:lifecycle.luarJadwal',
      'monitoring:lifecycle.lembur',
      'monitoring:lifecycle.lupaClockOut',
    ]);
  });

  it('is empty for a plain on-time scheduled worker, and survives a null array', () => {
    expect(lifecycleFlagPills({ is_scheduled: true, lifecycle_flags: [] })).toEqual([]);
    expect(lifecycleFlagPills({ lifecycle_flags: null })).toEqual([]);
    expect(lifecycleFlagPills({})).toEqual([]);
  });

  it('ignores flags it has no pill for rather than rendering a raw key', () => {
    expect(lifecycleFlagPills({ lifecycle_flags: ['early', 'excused'] })).toEqual([]);
  });
});

describe('lifecycleStatePill', () => {
  it('is null when no lifecycle has been derived', () => {
    expect(lifecycleStatePill({})).toBeNull();
    expect(lifecycleStatePill({ lifecycle_state: null })).toBeNull();
  });

  it('lets an approved leave outrank the lifecycle', () => {
    // Otherwise an excused absence reads on screen as a no-show.
    const pill = lifecycleStatePill({ lifecycle_state: 'tidak_hadir', leave_reason: 'sakit' });
    expect(pill).toEqual({ tone: 'blue', labelKey: 'monitoring:lifecycle.leave.sakit' });
  });

  it('takes its tone from the shared presence standard', () => {
    expect(lifecycleStatePill({ lifecycle_state: 'bertugas', is_within_area: true })?.tone).toBe(
      'green'
    );
    expect(lifecycleStatePill({ lifecycle_state: 'bertugas', is_within_area: false })?.tone).toBe(
      'amber'
    );
    expect(lifecycleStatePill({ lifecycle_state: 'tidak_hadir' })?.tone).toBe('red');
    // Ad-hoc wins over the lifecycle, matching the map's Luar Jadwal marker.
    expect(
      lifecycleStatePill({ lifecycle_state: 'bertugas', is_scheduled: false })?.tone
    ).toBe('purple');
  });

  it('builds the label key from the state', () => {
    expect(lifecycleStatePill({ lifecycle_state: 'belum_hadir' })?.labelKey).toBe(
      'monitoring:lifecycle.state.belum_hadir'
    );
  });
});
