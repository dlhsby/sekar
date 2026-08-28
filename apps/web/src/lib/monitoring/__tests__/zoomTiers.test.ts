import { tiersAtZoom, tiersFor, needsAreaGeometry, nextTierAt, TIER_ZOOM } from '../zoomTiers';

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

describe('tiersFor — drilling in overrides the zoom gate', () => {
  it('reveals the whole subtree once the operator has drilled in', () => {
    // The defect: "Rayon Taman Aktif" spans the whole city, so drilling into it
    // leaves the camera at city zoom and the gate showed NOTHING — 42 lokasi and
    // 3 petugas, hidden behind a "zoom in" hint, on a map that had ample room.
    //
    // Drilling in IS the request to see inside. Density is no longer the gate's
    // job either: progressive reveal caps the full pins and draws the rest as
    // dots, which is a better answer than hiding the tier outright.
    expect(tiersFor({ zoom: 11, scope: 'district' })).toEqual({
      district: true,
      region: true,
      location: true,
      workers: true,
    });
  });

  it('applies at every drilled scope, not just district', () => {
    for (const scope of ['district', 'region', 'location'] as const) {
      expect(tiersFor({ zoom: 10, scope }).location).toBe(true);
    }
  });

  it('keeps the zoom gate at city scope, where the subtree is 1089 nodes', () => {
    // The one place the gate still earns its keep: everything at once here is
    // every lokasi in Surabaya, which is real DOM even as dots.
    expect(tiersFor({ zoom: 11, scope: 'city' })).toEqual(tiersAtZoom(11));
    expect(tiersFor({ zoom: 15, scope: 'city' })).toEqual(tiersAtZoom(15));
  });

  it('keeps the zoom gate at the Surabaya summary too', () => {
    expect(tiersFor({ zoom: 11, scope: 'surabaya' }).region).toBe(false);
  });
});

describe('needsAreaGeometry with scope', () => {
  it('fetches full geometry once drilled in, so pins are not drawn shapeless', () => {
    // Markers and boundaries must agree. Admitting lokasi pins without their
    // polygons would draw pins floating over an empty rayon outline.
    expect(needsAreaGeometry(11, 'district')).toBe(true);
    expect(needsAreaGeometry(11, 'region')).toBe(true);
  });

  it('still defers the heavy payload at city scope', () => {
    expect(needsAreaGeometry(11, 'city')).toBe(false);
    expect(needsAreaGeometry(15, 'city')).toBe(true);
  });

  it('defaults to the zoom-only rule when no scope is given', () => {
    expect(needsAreaGeometry(11)).toBe(false);
    expect(needsAreaGeometry(15)).toBe(true);
  });
});

describe('nextTierAt with scope', () => {
  it('stops promising a tier that drilling has already revealed', () => {
    // Otherwise the hint reads "zoom in to see lokasi" while the lokasi are
    // already on screen — the map contradicting its own caption.
    expect(nextTierAt(11, 'district')).toBeNull();
  });

  it('still guides the operator at city scope', () => {
    expect(nextTierAt(11, 'city')).toBe('region');
  });
});
