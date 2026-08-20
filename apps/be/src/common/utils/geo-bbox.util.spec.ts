import {
  parseBBox,
  geometryBBox,
  bboxIntersects,
  pointInBBox,
  visibleIn,
  type BBox,
} from './geo-bbox.util';

/** Roughly central Surabaya. */
const BOX: BBox = [112.7, -7.3, 112.8, -7.2];

const polygon = (ring: [number, number][]) => ({ type: 'Polygon', coordinates: [ring] });

describe('parseBBox', () => {
  it('parses the four numbers in GeoJSON axis order', () => {
    expect(parseBBox('112.7,-7.3,112.8,-7.2')).toEqual([112.7, -7.3, 112.8, -7.2]);
  });

  it('normalises a box whose corners arrived swapped', () => {
    // A client that inverts its corners meant a region, not an empty map.
    expect(parseBBox('112.8,-7.2,112.7,-7.3')).toEqual([112.7, -7.3, 112.8, -7.2]);
  });

  it('returns null for anything unusable, so a bad value degrades to no filter', () => {
    expect(parseBBox(undefined)).toBeNull();
    expect(parseBBox('')).toBeNull();
    expect(parseBBox('1,2,3')).toBeNull();
    expect(parseBBox('a,b,c,d')).toBeNull();
    expect(parseBBox('112.7,-7.3,112.8,NaN')).toBeNull();
  });
});

describe('geometryBBox', () => {
  it('spans a Polygon', () => {
    expect(
      geometryBBox(
        polygon([
          [112.71, -7.29],
          [112.75, -7.29],
          [112.75, -7.21],
          [112.71, -7.21],
        ]),
      ),
    ).toEqual([112.71, -7.29, 112.75, -7.21]);
  });

  it('spans EVERY member of a MultiPolygon, not just the first', () => {
    // One walker handles both nesting depths; a Polygon-only reader would have
    // reported the first member's box and dropped the rest of the shape.
    const multi = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [112.71, -7.29],
            [112.72, -7.29],
            [112.72, -7.28],
          ],
        ],
        [
          [
            [112.78, -7.22],
            [112.79, -7.22],
            [112.79, -7.21],
          ],
        ],
      ],
    };
    expect(geometryBBox(multi)).toEqual([112.71, -7.29, 112.79, -7.21]);
  });

  it('returns null when there is no usable geometry', () => {
    expect(geometryBBox(null)).toBeNull();
    expect(geometryBBox({})).toBeNull();
    expect(geometryBBox({ type: 'Polygon', coordinates: [] })).toBeNull();
  });
});

describe('bboxIntersects / pointInBBox', () => {
  it('counts touching edges as overlapping', () => {
    expect(bboxIntersects([112.8, -7.2, 112.9, -7.1], BOX)).toBe(true);
  });

  it('rejects a disjoint box', () => {
    expect(bboxIntersects([113.0, -7.3, 113.1, -7.2], BOX)).toBe(false);
  });

  it('rejects a missing or non-finite point rather than treating it as origin', () => {
    expect(pointInBBox(null, 112.75, BOX)).toBe(false);
    expect(pointInBBox(-7.25, null, BOX)).toBe(false);
    expect(pointInBBox(NaN, 112.75, BOX)).toBe(false);
  });
});

describe('visibleIn', () => {
  it('prefers the polygon over the centre, so a shape larger than the camera survives', () => {
    // The case that matters: a rayon big enough to fill the screen has its
    // centre off-camera. A centre-only test would drop the outline the operator
    // is standing inside.
    const huge = polygon([
      [112.0, -7.9],
      [113.5, -7.9],
      [113.5, -6.5],
      [112.0, -6.5],
    ]);
    expect(visibleIn(BOX, huge, -7.7, 113.4)).toBe(true);
  });

  it('falls back to the centre when the entity carries no polygon', () => {
    // Kawasan frequently have none.
    expect(visibleIn(BOX, null, -7.25, 112.75)).toBe(true);
    expect(visibleIn(BOX, null, -7.9, 112.75)).toBe(false);
  });

  it('errs toward INCLUDING: a box that overlaps but an outline that does not', () => {
    // A diagonal sliver whose bounding box clips the corner of the viewport.
    // Over-inclusion costs a few KB; under-inclusion blanks a real boundary.
    const diagonal = polygon([
      [112.79, -7.21],
      [112.95, -7.05],
      [112.96, -7.06],
    ]);
    expect(visibleIn(BOX, diagonal, -7.1, 112.9)).toBe(true);
  });
});
