import { tiersAtDelta, tiersFor, nextTierAtDelta, TIER_DELTA } from '../zoomTiers';

describe('tiersAtDelta', () => {
  it('shows the rayon frame ONLY at city height', () => {
    // The defect this fixes: a bbox at city height is the whole city, so
    // viewport mode still drew every kawasan and lokasi at once.
    expect(tiersAtDelta(0.17)).toEqual({
      district: true,
      region: false,
      location: false,
      workers: false,
    });
  });

  it('adds kawasan once roughly one rayon fills the screen', () => {
    const t = tiersAtDelta(TIER_DELTA.region);
    expect([t.region, t.location]).toEqual([true, false]);
  });

  it('adds lokasi AND workers together — the densest layers, revealed last', () => {
    const t = tiersAtDelta(TIER_DELTA.location);
    expect([t.region, t.location, t.workers]).toEqual([true, true, true]);
  });

  it('reads SMALLER delta as closer in — the comparison is inverted vs web zoom', () => {
    expect(tiersAtDelta(0.002).location).toBe(true);
    expect(tiersAtDelta(2).region).toBe(false);
  });

  it('keeps rayon on at every height — it is the map frame, never hidden by depth', () => {
    for (const d of [5, 0.17, 0.05, 0.001]) expect(tiersAtDelta(d).district).toBe(true);
  });

  it('treats an unknown camera as the LIGHTEST view, not the heaviest', () => {
    expect(tiersAtDelta(undefined).region).toBe(false);
    expect(tiersAtDelta(NaN).location).toBe(false);
  });
});

describe('nextTierAtDelta', () => {
  it('names the tier the operator would gain by zooming in', () => {
    expect(nextTierAtDelta(0.17)).toBe('region');
    expect(nextTierAtDelta(TIER_DELTA.region)).toBe('location');
  });

  it('is null at full depth, so a hint disappears rather than lying', () => {
    expect(nextTierAtDelta(TIER_DELTA.location)).toBeNull();
  });
});

describe('tiersFor — drilling in overrides the span gate', () => {
  it('reveals the whole subtree once the operator has drilled in', () => {
    // The defect: "Rayon Taman Aktif" spans the whole city, so drilling into it
    // leaves the camera wide and the span gate hid all 42 of its lokasi behind a
    // "zoom in" hint — on a map with room to spare.
    expect(tiersFor({ latitudeDelta: 0.3, scope: 'district' })).toEqual({
      district: true,
      region: true,
      location: true,
      workers: true,
    });
  });

  it('applies at every drilled scope, not just district', () => {
    for (const scope of ['district', 'region', 'location'] as const) {
      expect(tiersFor({ latitudeDelta: 0.3, scope }).location).toBe(true);
    }
  });

  it('keeps the span gate at city scope, where the subtree is the whole city', () => {
    // The one place the gate still earns its keep: everything at once here is
    // every lokasi in Surabaya.
    expect(tiersFor({ latitudeDelta: 0.3, scope: 'city' })).toEqual(tiersAtDelta(0.3));
    expect(tiersFor({ latitudeDelta: 0.01, scope: 'city' })).toEqual(tiersAtDelta(0.01));
  });

  it('keeps the span gate at the Surabaya summary too', () => {
    expect(tiersFor({ latitudeDelta: 0.3, scope: 'surabaya' }).region).toBe(false);
  });
});

describe('nextTierAtDelta with scope', () => {
  it('stops promising a tier that drilling has already revealed', () => {
    // Otherwise the hint reads "zoom in to see lokasi" while the lokasi are on
    // screen — the map contradicting its own caption.
    expect(nextTierAtDelta(0.3, 'district')).toBeNull();
  });

  it('still guides the operator at city scope', () => {
    expect(nextTierAtDelta(0.3, 'city')).toBe('region');
  });

  it('defaults to the span-only rule when no scope is given', () => {
    expect(nextTierAtDelta(0.3)).toBe('region');
    expect(nextTierAtDelta(TIER_DELTA.location)).toBeNull();
  });
});
