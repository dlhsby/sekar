/**
 * Web Mercator projection — the basis of every collision decision.
 *
 * Collisions happen in SCREEN space, not on the ground: two kawasan 200 m apart
 * overlap at zoom 11 and are half a screen apart at zoom 16. Ranking therefore
 * needs pixels, and pixels need this.
 */
import { projectToPixel, pixelDistance, TILE_SIZE } from '../mercator';

describe('projectToPixel', () => {
  it('puts null island at the centre of the zoom-0 world tile', () => {
    // The whole world is one 256px tile at zoom 0, so (0,0) sits at its middle.
    // This is the anchor the rest of the projection is defined against.
    expect(projectToPixel(0, 0, 0)).toEqual({ x: TILE_SIZE / 2, y: TILE_SIZE / 2 });
  });

  it('doubles the world with each zoom level', () => {
    const z0 = projectToPixel(0, 180, 0);
    const z1 = projectToPixel(0, 180, 1);
    expect(z1.x).toBeCloseTo(z0.x * 2, 6);
  });

  it('maps longitude linearly and latitude non-linearly', () => {
    // Longitude is a straight scale; latitude is stretched toward the poles.
    // Getting these backwards is the classic Mercator bug, so both are pinned.
    const west = projectToPixel(0, -180, 2);
    const east = projectToPixel(0, 180, 2);
    expect(east.x - west.x).toBeCloseTo(TILE_SIZE * 4, 6);

    const equator = projectToPixel(0, 0, 2);
    const mid = projectToPixel(45, 0, 2);
    const high = projectToPixel(60, 0, 2);
    // Equal latitude steps must NOT produce equal pixel steps.
    expect(equator.y - mid.y).not.toBeCloseTo(mid.y - high.y, 1);
    expect(mid.y).toBeLessThan(equator.y);
  });

  it('clamps the poles instead of returning Infinity', () => {
    // ln((1+sin)/(1-sin)) diverges at ±90°. Unclamped this yields Infinity and
    // every downstream grid cell becomes NaN.
    for (const lat of [90, -90, 89.9999, -89.9999]) {
      const p = projectToPixel(lat, 0, 3);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it('places Surabaya at a stable pixel for a given zoom', () => {
    // Regression anchor on the city this map actually shows. Any change to the
    // projection constants moves this and fails loudly.
    const p = projectToPixel(-7.2575, 112.7521, 12);
    expect(p.x).toBeCloseTo(852702.29, 1);
    expect(p.y).toBeCloseTo(545483.76, 1);
  });
});

describe('pixelDistance', () => {
  it('measures euclidean separation', () => {
    expect(pixelDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
