/**
 * Screen-space decluttering — who gets a full pin and who gets a dot.
 *
 * The rule the whole feature rests on: nothing is ever DROPPED. `declutter`
 * returns the promoted set; everything else still renders, as a dot. So these
 * tests assert selection, never disappearance.
 */
import {
  declutter,
  DEFAULT_CELL_X,
  DEFAULT_CELL_Y,
  DEFAULT_CAP,
  type DeclutterCandidate,
} from '../declutter';

const at = (id: string, lat: number, lng: number, score: number): DeclutterCandidate => ({
  id,
  lat,
  lng,
  score,
});

/** Surabaya-ish coordinates, so the numbers stay in the range this map works in. */
const BASE_LAT = -7.2575;
const BASE_LNG = 112.7521;

describe('declutter', () => {
  it('promotes everything when nothing collides and the cap is not reached', () => {
    // Well-separated markers must not be demoted for no reason: the budget is a
    // response to crowding, not a quota applied unconditionally.
    const spread = [
      at('a', BASE_LAT, BASE_LNG, 1),
      at('b', BASE_LAT + 0.2, BASE_LNG, 1),
      at('c', BASE_LAT, BASE_LNG + 0.2, 1),
    ];
    expect(declutter(spread, { zoom: 14 })).toEqual(new Set(['a', 'b', 'c']));
  });

  it('promotes only the highest score among colliding markers', () => {
    // Three pins at effectively the same spot: one full pin, two dots.
    const stacked = [
      at('low', BASE_LAT, BASE_LNG, 1),
      at('high', BASE_LAT + 0.00001, BASE_LNG, 9),
      at('mid', BASE_LAT + 0.00002, BASE_LNG, 5),
    ];
    expect(declutter(stacked, { zoom: 11 })).toEqual(new Set(['high']));
  });

  it('separates the same markers as you zoom in', () => {
    // The core interaction: identical data, more detail, purely because the
    // ground distance between them now spans more pixels.
    const pair = [at('a', BASE_LAT, BASE_LNG, 1), at('b', BASE_LAT + 0.002, BASE_LNG, 2)];
    expect(declutter(pair, { zoom: 11 }).size).toBe(1);
    expect(declutter(pair, { zoom: 17 }).size).toBe(2);
  });

  it('breaks ties deterministically, so panning never reshuffles the map', () => {
    // Equal scores in one cell must resolve the same way every render, or pins
    // would swap places on an idle event and the map would shimmer.
    const tied = [at('b', BASE_LAT, BASE_LNG, 5), at('a', BASE_LAT + 0.00001, BASE_LNG, 5)];
    const first = declutter(tied, { zoom: 11 });
    const again = declutter([...tied].reverse(), { zoom: 11 });
    expect(first).toEqual(again);
    expect(first).toEqual(new Set(['a']));
  });

  it('honours the global cap, keeping the highest scores', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      at(`n${i}`, BASE_LAT + i * 0.05, BASE_LNG, i)
    );
    const promoted = declutter(many, { zoom: 14, cap: 5 });
    expect(promoted.size).toBe(5);
    expect(promoted.has('n49')).toBe(true);
    expect(promoted.has('n0')).toBe(false);
  });

  it('always promotes an exempt marker, even when it loses its cell', () => {
    // The selected worker and the open detail node. If the map stopped drawing
    // the thing the sidebar is describing, the card would document something
    // invisible.
    const stacked = [
      at('winner', BASE_LAT, BASE_LNG, 99),
      at('selected', BASE_LAT + 0.00001, BASE_LNG, 0),
    ];
    const promoted = declutter(stacked, { zoom: 11, exempt: ['selected'] });
    expect(promoted.has('selected')).toBe(true);
    expect(promoted.has('winner')).toBe(true);
  });

  it('lets exempt markers bypass the cap entirely', () => {
    const many = Array.from({ length: 10 }, (_, i) => at(`n${i}`, BASE_LAT + i * 0.05, BASE_LNG, i));
    const promoted = declutter(many, { zoom: 14, cap: 1, exempt: ['n0'] });
    expect(promoted.has('n0')).toBe(true);
    expect(promoted.size).toBe(2); // the cap winner plus the exemption
  });

  it('ignores exempt ids that are not candidates', () => {
    const promoted = declutter([at('a', BASE_LAT, BASE_LNG, 1)], {
      zoom: 14,
      exempt: ['ghost'],
    });
    expect(promoted).toEqual(new Set(['a']));
  });

  it('skips markers with unusable coordinates', () => {
    // A location with no boundary centroid arrives as NaN. It must be dropped
    // from the RANKING without taking the rest of the map with it.
    const mixed = [
      at('good', BASE_LAT, BASE_LNG, 1),
      at('bad', NaN, BASE_LNG, 99),
      at('worse', BASE_LAT, Infinity, 99),
    ];
    expect(declutter(mixed, { zoom: 14 })).toEqual(new Set(['good']));
  });

  it('separates neighbours that a cell grid would have let through', () => {
    // The defect that replaced the grid with a real separation test. Two markers
    // ~50px apart both survived when they happened to straddle a cell boundary,
    // and their labels overlapped on screen anyway. Cell membership is a proxy
    // for distance; this measures distance.
    //
    // At zoom 14 one pixel is ~8.58e-5 degrees, so the pair below sits ~100px
    // apart — comfortably inside the 150px separation box, yet far enough that a
    // 150px cell grid drops them in different cells for most of a sweep.
    //
    // The sweep slides the pair across more than a full cell width, so it lands
    // on every phase including astride a boundary. Under the old grid this
    // failed on the offsets where the boundary fell between them.
    const PX = 360 / (256 * 2 ** 14);
    for (let i = 0; i < 30; i++) {
      const lng = BASE_LNG + i * 7 * PX;
      const pair = [at('a', BASE_LAT, lng, 2), at('b', BASE_LAT, lng + 100 * PX, 1)];
      expect(declutter(pair, { zoom: 14 }).size).toBe(1);
    }
  });

  it('returns an empty set for no candidates', () => {
    expect(declutter([], { zoom: 14 })).toEqual(new Set());
  });

  it('does not mutate or reorder its input', () => {
    const input = [at('b', BASE_LAT, BASE_LNG, 1), at('a', BASE_LAT + 0.2, BASE_LNG, 9)];
    const snapshot = JSON.parse(JSON.stringify(input));
    declutter(input, { zoom: 14 });
    expect(input).toEqual(snapshot);
    expect(input[0].id).toBe('b');
  });

  it('exposes sane defaults, with a cell wider than it is tall', () => {
    // Not a stylistic preference: the collision axis for a labelled marker is
    // horizontal (a ~150px name beside a ~40px pin), while a label is one line
    // tall. A square cell either lets labels collide or throws away vertical
    // density. If these ever become equal, that reasoning has been lost.
    expect(DEFAULT_CELL_Y).toBeGreaterThan(0);
    expect(DEFAULT_CELL_X).toBeGreaterThan(DEFAULT_CELL_Y);
    expect(DEFAULT_CAP).toBeGreaterThan(0);
  });

  it('separates markers stacked vertically sooner than side-by-side ones', () => {
    // The direct consequence of the rectangular cell, and the reason it exists:
    // two names side by side need more room than two stacked, because only the
    // horizontal pair can overlap.
    const zoom = 14;
    // ~0.0018 deg of longitude and of latitude are a similar pixel distance at
    // this zoom, so the only thing separating these two cases is the cell shape.
    const sideBySide = [
      at('a', BASE_LAT, BASE_LNG, 2),
      at('b', BASE_LAT, BASE_LNG + 0.0018, 1),
    ];
    const stacked = [
      at('a', BASE_LAT, BASE_LNG, 2),
      at('b', BASE_LAT + 0.0018, BASE_LNG, 1),
    ];
    expect(declutter(stacked, { zoom }).size).toBeGreaterThanOrEqual(
      declutter(sideBySide, { zoom }).size
    );
  });
});
