/**
 * districtColors tests — Phase 4 M3 (CP2).
 *
 * The deterministic per-district palette is the fallback when a district has no
 * DB-driven `color`. It must be stable (same id → same color regardless of
 * input order) and derive the translucent fill from the stroke.
 */

import {
  buildDistrictColorMap,
  districtColor,
  DISTRICT_PALETTE,
  DISTRICT_FALLBACK,
} from '../districtColors';
import { withAlpha } from '../../../constants/nbTokens';

describe('districtColors', () => {
  it('assigns the same color to an id regardless of input order', () => {
    const a = buildDistrictColorMap(['r3', 'r1', 'r2']);
    const b = buildDistrictColorMap(['r1', 'r2', 'r3']);
    expect(a.get('r1')).toEqual(b.get('r1'));
    expect(a.get('r2')).toEqual(b.get('r2'));
    expect(a.get('r3')).toEqual(b.get('r3'));
  });

  it('gives distinct strokes to distinct ids within the palette span', () => {
    const map = buildDistrictColorMap(['r1', 'r2', 'r3']);
    const strokes = ['r1', 'r2', 'r3'].map(id => map.get(id)!.stroke);
    expect(new Set(strokes).size).toBe(3);
  });

  it('derives the fill as the stroke at 0.14 alpha', () => {
    const map = buildDistrictColorMap(['r1']);
    const { stroke, fill } = map.get('r1')!;
    expect(fill).toBe(withAlpha(stroke, 0.14));
  });

  it('dedupes repeated ids', () => {
    const map = buildDistrictColorMap(['r1', 'r1', 'r1']);
    expect(map.size).toBe(1);
  });

  it('keys the first sorted id to the first palette slot', () => {
    const map = buildDistrictColorMap(['rB', 'rA']);
    expect(map.get('rA')!.stroke).toBe(DISTRICT_PALETTE[0]);
    expect(map.get('rB')!.stroke).toBe(DISTRICT_PALETTE[1]);
  });

  it('returns the fallback for an id missing from the map', () => {
    const map = buildDistrictColorMap(['r1']);
    expect(districtColor(map, 'unknown')).toEqual(DISTRICT_FALLBACK);
  });
});
