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
  PIN_CELL_X,
  type DeclutterCandidate,
} from '../declutter';

const BASE_LAT = -7.2575;
const BASE_LNG = 112.7521;
const at = (id: string, lat: number, lng: number, score: number): DeclutterCandidate => ({
  id,
  lat,
  lng,
  score,
});

describe('declutter', () => {
  it('promotes everything when nothing collides', () => {
    const spread = [
      at('a', BASE_LAT, BASE_LNG, 1),
      at('b', BASE_LAT + 0.2, BASE_LNG, 1),
      at('c', BASE_LAT, BASE_LNG + 0.2, 1),
    ];
    expect(declutter(spread, { zoom: 14 })).toEqual(new Set(['a', 'b', 'c']));
  });

  it('promotes only the highest score among colliding markers', () => {
    const stacked = [
      at('low', BASE_LAT, BASE_LNG, 1),
      at('high', BASE_LAT + 0.00001, BASE_LNG, 9),
      at('mid', BASE_LAT + 0.00002, BASE_LNG, 5),
    ];
    expect(declutter(stacked, { zoom: 11 })).toEqual(new Set(['high']));
  });

  it('separates the same markers as the camera moves in', () => {
    const pair = [at('a', BASE_LAT, BASE_LNG, 1), at('b', BASE_LAT + 0.002, BASE_LNG, 2)];
    expect(declutter(pair, { zoom: 11 }).size).toBe(1);
    expect(declutter(pair, { zoom: 18 }).size).toBe(2);
  });

  it('breaks ties deterministically, so panning never reshuffles the map', () => {
    const tied = [at('b', BASE_LAT, BASE_LNG, 5), at('a', BASE_LAT + 0.00001, BASE_LNG, 5)];
    expect(declutter(tied, { zoom: 11 })).toEqual(new Set(['a']));
    expect(declutter([...tied].reverse(), { zoom: 11 })).toEqual(new Set(['a']));
  });

  it('measures DISTANCE, not cell membership', () => {
    // A grid leaks: two markers inside the separation box that straddle a cell
    // boundary land in different cells and both survive. Swept across more than
    // a full box width so the pair lands on every phase, including astride one.
    const PX = 360 / (256 * 2 ** 14);
    for (let i = 0; i < 30; i++) {
      const lng = BASE_LNG + i * 6 * PX;
      const pair = [at('a', BASE_LAT, lng, 2), at('b', BASE_LAT, lng + (PIN_CELL_X - 6) * PX, 1)];
      expect(declutter(pair, { zoom: 14, cellX: PIN_CELL_X }).size).toBe(1);
    }
  });

  it('honours the global cap, keeping the highest scores', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      at(`n${i}`, BASE_LAT + i * 0.05, BASE_LNG, i),
    );
    const promoted = declutter(many, { zoom: 14, cap: 5 });
    expect(promoted.size).toBe(5);
    expect(promoted.has('n49')).toBe(true);
    expect(promoted.has('n0')).toBe(false);
  });

  it('always promotes an exempt marker, even when it loses its space', () => {
    // Whatever the sheet is describing must stay drawn, or the card documents
    // something invisible.
    const stacked = [
      at('winner', BASE_LAT, BASE_LNG, 99),
      at('selected', BASE_LAT + 0.00001, BASE_LNG, 0),
    ];
    const promoted = declutter(stacked, { zoom: 11, exempt: ['selected'] });
    expect(promoted.has('selected')).toBe(true);
    expect(promoted.has('winner')).toBe(true);
  });

  it('lets exempt markers bypass the cap entirely', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      at(`n${i}`, BASE_LAT + i * 0.05, BASE_LNG, i),
    );
    const promoted = declutter(many, { zoom: 14, cap: 1, exempt: ['n0'] });
    expect(promoted.has('n0')).toBe(true);
    expect(promoted.size).toBe(2);
  });

  it('skips markers with unusable coordinates', () => {
    // A location with no boundary centroid arrives as NaN. It must leave the
    // RANKING without taking the rest of the map with it.
    const mixed = [
      at('good', BASE_LAT, BASE_LNG, 1),
      at('bad', NaN, BASE_LNG, 99),
      at('worse', BASE_LAT, Infinity, 99),
    ];
    expect(declutter(mixed, { zoom: 14 })).toEqual(new Set(['good']));
  });

  it('returns an empty set for no candidates', () => {
    expect(declutter([], { zoom: 14 })).toEqual(new Set());
  });

  it('does not mutate or reorder its input', () => {
    const input = [at('b', BASE_LAT, BASE_LNG, 1), at('a', BASE_LAT + 0.2, BASE_LNG, 9)];
    declutter(input, { zoom: 14 });
    expect(input[0].id).toBe('b');
  });

  it('exposes a box wider than it is tall, sized for a phone', () => {
    // The collision axis for a labelled marker is horizontal. And a phone
    // viewport is about a third of a laptop's, so web's 150x96 would leave
    // almost nothing drawn.
    expect(DEFAULT_CELL_X).toBeGreaterThan(DEFAULT_CELL_Y);
    expect(DEFAULT_CELL_X).toBeLessThan(150);
    expect(DEFAULT_CAP).toBeGreaterThan(0);
    expect(PIN_CELL_X).toBeLessThan(DEFAULT_CELL_X);
  });
});
