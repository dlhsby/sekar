import { decideAttribution, REATTRIBUTE_AFTER_MS } from './place-attribution';

const T0 = new Date('2026-10-01T02:00:00Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

describe('decideAttribution', () => {
  const base = { current: 'A', pendingId: null, pendingSince: null };

  it('stays put while the worker is inside the attributed place', () => {
    expect(decideAttribution({ ...base, containing: 'A', at: T0 })).toEqual({
      locationId: 'A',
      pendingId: null,
      pendingSince: null,
      switched: false,
    });
  });

  it('stays put when outside every assigned place (outside-area, not moved)', () => {
    expect(decideAttribution({ ...base, containing: null, at: T0 }).locationId).toBe('A');
  });

  it('starts a pending switch on first sight of another assigned place', () => {
    expect(decideAttribution({ ...base, containing: 'B', at: T0 })).toEqual({
      locationId: 'A',
      pendingId: 'B',
      pendingSince: T0,
      switched: false,
    });
  });

  it('switches only after staying in the other place long enough', () => {
    const pending = { current: 'A', pendingId: 'B', pendingSince: T0 };
    expect(
      decideAttribution({ ...pending, containing: 'B', at: at(REATTRIBUTE_AFTER_MS - 1) }).switched,
    ).toBe(false);
    expect(
      decideAttribution({ ...pending, containing: 'B', at: at(REATTRIBUTE_AFTER_MS) }),
    ).toEqual({
      locationId: 'B',
      pendingId: null,
      pendingSince: null,
      switched: true,
    });
  });

  it('GPS jitter back into the current place cancels the pending switch', () => {
    const pending = { current: 'A', pendingId: 'B', pendingSince: T0 };
    expect(decideAttribution({ ...pending, containing: 'A', at: at(60_000) })).toEqual({
      locationId: 'A',
      pendingId: null,
      pendingSince: null,
      switched: false,
    });
  });

  it("a third place restarts the clock instead of inheriting B's time", () => {
    const pending = { current: 'A', pendingId: 'B', pendingSince: T0 };
    expect(
      decideAttribution({ ...pending, containing: 'C', at: at(REATTRIBUTE_AFTER_MS * 2) }),
    ).toEqual({
      locationId: 'A',
      pendingId: 'C',
      pendingSince: at(REATTRIBUTE_AFTER_MS * 2),
      switched: false,
    });
  });

  it('a worker with no attributed place takes the first one immediately', () => {
    expect(
      decideAttribution({
        current: null,
        pendingId: null,
        pendingSince: null,
        containing: 'B',
        at: T0,
      }),
    ).toEqual({ locationId: 'B', pendingId: null, pendingSince: null, switched: true });
  });
});
