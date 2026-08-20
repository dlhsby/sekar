import { tiersAtZoom, needsAreaGeometry, nextTierAt, TIER_ZOOM } from '../zoomTiers';

describe('tiersAtZoom', () => {
  it('shows the rayon frame ONLY at city zoom', () => {
    // The defect this fixes: a bbox at city zoom is the whole city, so viewport
    // mode still drew every kawasan and lokasi — hundreds of stacked pins.
    expect(tiersAtZoom(11)).toEqual({
      district: true,
      region: false,
      location: false,
      workers: false,
    });
  });

  it('adds kawasan once roughly one rayon fills the screen', () => {
    const t = tiersAtZoom(TIER_ZOOM.region);
    expect([t.region, t.location]).toEqual([true, false]);
  });

  it('adds lokasi AND workers together — the densest layers, revealed last', () => {
    const t = tiersAtZoom(TIER_ZOOM.location);
    expect([t.region, t.location, t.workers]).toEqual([true, true, true]);
  });

  it('keeps rayon on at every zoom — it is the map frame, never hidden by depth', () => {
    for (const z of [0, 5, 11, 14, 20]) expect(tiersAtZoom(z).district).toBe(true);
  });

  it('treats an unknown zoom as the LIGHTEST view, not the heaviest', () => {
    // Before the map reports a zoom, guessing "everything" would flash the heavy
    // view for a frame — precisely what this mode exists to avoid.
    expect(tiersAtZoom(undefined).region).toBe(false);
    expect(tiersAtZoom(NaN).location).toBe(false);
  });
});

describe('needsAreaGeometry', () => {
  it('is false below the kawasan threshold, so no lokasi polygon is downloaded', () => {
    expect(needsAreaGeometry(11)).toBe(false);
  });

  it('is true once kawasan draw', () => {
    expect(needsAreaGeometry(TIER_ZOOM.region)).toBe(true);
  });
});

describe('nextTierAt', () => {
  it('names the tier the operator would gain by zooming in', () => {
    // A missing layer must read as "not yet", not as broken data.
    expect(nextTierAt(11)).toBe('region');
    expect(nextTierAt(TIER_ZOOM.region)).toBe('location');
  });

  it('is null at full depth, so the hint disappears rather than lying', () => {
    expect(nextTierAt(TIER_ZOOM.location)).toBeNull();
  });
});
