import { regionToBox, regionWithinBox, type MapRegion } from '../viewportBox';

/** A 0.1° square around central Surabaya, so the arithmetic reads easily. */
const REGION: MapRegion = {
  latitude: -7.25,
  longitude: 112.75,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

describe('regionToBox', () => {
  it('grows the camera by half a screen on every side', () => {
    // 0.1° span → 0.2° box: the margin is what stops an ordinary pan refetching.
    expect(regionToBox(REGION)).toBe('112.65,-7.35,112.85,-7.15');
  });

  it('quantises, so an unchanged camera produces the same request', () => {
    expect(regionToBox({ ...REGION, latitude: -7.25000004 })).toBe(regionToBox(REGION));
  });

  it('tolerates a negative delta rather than inverting the box', () => {
    expect(regionToBox({ ...REGION, latitudeDelta: -0.1 })).toBe(regionToBox(REGION));
  });
});

describe('regionWithinBox', () => {
  const box = regionToBox(REGION);

  it('accepts a camera still inside the fetched region', () => {
    expect(regionWithinBox({ ...REGION, latitude: -7.26, longitude: 112.76 }, box)).toBe(true);
  });

  it('rejects a camera that panned past the edge', () => {
    expect(regionWithinBox({ ...REGION, longitude: 113.0 }, box)).toBe(false);
  });

  it('rejects a camera that zoomed OUT past the region, not just one that moved', () => {
    // The case a centre-only test would miss: same centre, wider span.
    expect(
      regionWithinBox({ ...REGION, latitudeDelta: 1.5, longitudeDelta: 1.5 }, box),
    ).toBe(false);
  });

  it('treats an unparseable box as "not inside", so it refetches rather than blanks', () => {
    expect(regionWithinBox(REGION, 'nonsense')).toBe(false);
  });
});
