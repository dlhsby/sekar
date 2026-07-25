import { ShiftAttributionService, AttributionCandidate } from './shift-attribution.service';

/**
 * ADR-055 attribution window — the executable spec for "which shift does a
 * clock-in near a boundary belong to". Covers the Catapa cases the user
 * described: offered before start (early), attributed across midnight to
 * yesterday's shift, and dropping out past the cutoff (dangling).
 */
describe('ShiftAttributionService', () => {
  let service: ShiftAttributionService;
  beforeEach(() => (service = new ShiftAttributionService()));

  // WIB wall-clock expressed as a UTC-framed Date, matching TimezoneUtil.jakartaNow().
  const wib = (iso: string) => new Date(`${iso}:00Z`);

  const shift1 = (serviceDay: string): AttributionCandidate => ({
    shift_definition_id: 'sd-1',
    service_day: serviceDay,
    start_time: '06:00',
    end_time: '15:00',
    crosses_midnight: false,
    early_window_min: 60,
    cutoff_grace_min: 60,
  });
  const shift3 = (serviceDay: string): AttributionCandidate => ({
    shift_definition_id: 'sd-3',
    service_day: serviceDay,
    start_time: '21:00',
    end_time: '05:00',
    crosses_midnight: true,
    early_window_min: 60,
    cutoff_grace_min: 60,
  });

  it('attributes a clock-in inside the shift (covering)', () => {
    const best = service.resolveBest([shift1('2026-07-24')], wib('2026-07-24T08:00'));
    expect(best?.candidate.shift_definition_id).toBe('sd-1');
    expect(best?.phase).toBe('covering');
  });

  it('offers the shift up to early_window before start (early)', () => {
    const best = service.resolveBest([shift1('2026-07-24')], wib('2026-07-24T05:30')); // 30m before 06:00
    expect(best?.phase).toBe('early');
    expect(best?.minutesToStart).toBe(30);
  });

  it('does NOT offer the shift beyond the early window', () => {
    const best = service.resolveBest([shift1('2026-07-24')], wib('2026-07-24T04:45')); // 75m before > 60
    expect(best).toBeNull();
  });

  it('attributes a POST-MIDNIGHT clock-in to YESTERDAY’s crossing shift', () => {
    // 00:30 on the 25th belongs to Shift 3 started 21:00 on the 24th.
    const best = service.resolveBest([shift3('2026-07-24')], wib('2026-07-25T00:30'));
    expect(best?.candidate.shift_definition_id).toBe('sd-3');
    expect(best?.candidate.service_day).toBe('2026-07-24'); // start date, not today
    expect(best?.phase).toBe('covering');
  });

  it('keeps a crossing shift attributable through its cutoff grace', () => {
    // 05:30 on the 25th = 30m after Shift 3’s 05:00 end (within 60m grace).
    const best = service.resolveBest([shift3('2026-07-24')], wib('2026-07-25T05:30'));
    expect(best?.candidate.shift_definition_id).toBe('sd-3');
    expect(best?.phase).toBe('grace');
  });

  it('drops the crossing shift past the cutoff (dangling — becomes lupa_clock_out)', () => {
    // 06:30 on the 25th > 05:00 end + 60m grace = 06:00.
    const best = service.resolveBest([shift3('2026-07-24')], wib('2026-07-25T06:30'));
    expect(best).toBeNull();
  });

  it('prefers COVERING over an overlapping early/grace candidate', () => {
    // At 21:30 on the 24th: Shift 3 covering vs (no other). Add a decoy grace shift.
    const all = service.resolveAll(
      [shift3('2026-07-24'), shift1('2026-07-24')],
      wib('2026-07-24T21:30'),
    );
    expect(all[0].candidate.shift_definition_id).toBe('sd-3'); // covering wins
    expect(all[0].phase).toBe('covering');
  });

  it('prefers the UPCOMING shift (early) over a just-ended shift (grace)', () => {
    // 05:30 on the 25th: Shift 1 (starts 06:00, early) vs Shift 3 (ended 05:00, grace).
    const best = service.resolveBest(
      [shift3('2026-07-24'), shift1('2026-07-25')],
      wib('2026-07-25T05:30'),
    );
    expect(best?.candidate.shift_definition_id).toBe('sd-1'); // early beats grace
    expect(best?.phase).toBe('early');
  });

  it('returns empty when the worker has no shifts in window', () => {
    expect(service.resolveAll([shift1('2026-07-24')], wib('2026-07-24T20:00'))).toEqual([]);
  });

  it('honors a per-shift zero early window (no early offering)', () => {
    const noEarly: AttributionCandidate = { ...shift1('2026-07-24'), early_window_min: 0 };
    expect(service.resolveBest([noEarly], wib('2026-07-24T05:30'))).toBeNull(); // not yet started
    expect(service.resolveBest([noEarly], wib('2026-07-24T06:00'))?.phase).toBe('covering');
  });
});
