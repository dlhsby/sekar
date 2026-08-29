/**
 * Web Mercator projection, and the bridge from this platform's camera model.
 *
 * Collision is a SCREEN-space question, so ranking needs pixels — and on mobile
 * getting to pixels needs one step web does not, because `react-native-maps`
 * reports a coordinate SPAN where Google's web SDK reports a zoom level.
 */
import { projectToPixel, deltaToZoom, TILE_SIZE } from '../mercator';

describe('projectToPixel', () => {
  it('puts null island at the centre of the zoom-0 world tile', () => {
    expect(projectToPixel(0, 0, 0)).toEqual({ x: TILE_SIZE / 2, y: TILE_SIZE / 2 });
  });

  it('doubles the world with each zoom level', () => {
    expect(projectToPixel(0, 180, 1).x).toBeCloseTo(projectToPixel(0, 180, 0).x * 2, 6);
  });

  it('maps longitude linearly and latitude non-linearly', () => {
    // Getting these backwards is the classic Mercator bug, so both are pinned.
    const west = projectToPixel(0, -180, 2);
    const east = projectToPixel(0, 180, 2);
    expect(east.x - west.x).toBeCloseTo(TILE_SIZE * 4, 6);

    const equator = projectToPixel(0, 0, 2);
    const mid = projectToPixel(45, 0, 2);
    const high = projectToPixel(60, 0, 2);
    expect(equator.y - mid.y).not.toBeCloseTo(mid.y - high.y, 1);
    expect(mid.y).toBeLessThan(equator.y);
  });

  it('clamps the poles instead of returning Infinity', () => {
    // ln((1+sin)/(1-sin)) diverges at ±90°. Unclamped, every collision test
    // downstream becomes NaN.
    for (const lat of [90, -90, 89.9999, -89.9999]) {
      expect(Number.isFinite(projectToPixel(lat, 0, 3).y)).toBe(true);
    }
  });

  it('places Surabaya at a stable pixel for a given zoom', () => {
    // Regression anchor on the city this map actually shows.
    const p = projectToPixel(-7.2575, 112.7521, 12);
    expect(p.x).toBeCloseTo(852702.29, 1);
    expect(p.y).toBeCloseTo(545483.76, 1);
  });
});

describe('deltaToZoom', () => {
  it('maps a full-world span to zoom 0 on a one-tile-wide viewport', () => {
    expect(deltaToZoom(360, TILE_SIZE)).toBeCloseTo(0, 6);
  });

  it('gains a zoom level each time the span halves', () => {
    expect(deltaToZoom(0.04, 390) - deltaToZoom(0.08, 390)).toBeCloseTo(1, 6);
  });

  it('never returns a negative or non-finite zoom', () => {
    // A zero or absent delta arrives on the first frame, before the camera
    // reports. It must degrade to "zoomed all the way out", not to NaN.
    for (const d of [0, -1, NaN, Infinity]) {
      const z = deltaToZoom(d, 390);
      expect(Number.isFinite(z)).toBe(true);
      expect(z).toBeGreaterThanOrEqual(0);
    }
  });

  it('produces a Surabaya-scale zoom for a city-wide span on a phone', () => {
    // Sanity that the bridge lands in the range the tier thresholds assume:
    // the whole city on a ~390pt-wide phone is roughly zoom 10-12.
    const z = deltaToZoom(0.35, 390);
    expect(z).toBeGreaterThan(9);
    expect(z).toBeLessThan(13);
  });
});
