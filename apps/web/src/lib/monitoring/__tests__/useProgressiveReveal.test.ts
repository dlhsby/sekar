/**
 * Progressive reveal — the integration point of salience, affinity and grid.
 *
 * The tests that matter here are the ones about what must NOT change: drill and
 * zoom mode untouched, layers independent of each other, and the operator's
 * current selection always drawn.
 */
import { computeReveal, quantiseZoom, REVEAL_OFF, type ProgressiveRevealInput } from '../useProgressiveReveal';

const LAT = -7.2575;
const LNG = 112.7521;

const node = (id: string, i: number, over = {}) => ({
  id,
  lat: LAT + i * 0.0002,
  lng: LNG,
  variant: 'region' as const,
  scheduled: 8,
  clocked_in: 8,
  belum_hadir: 0,
  tidak_hadir: 0,
  ...over,
});

const worker = (user_id: string, i: number, over = {}) => ({
  user_id,
  lat: LAT + i * 0.0002,
  lng: LNG,
  status: 'active',
  is_within_area: true,
  is_scheduled: true,
  ...over,
});

const input = (over: Partial<ProgressiveRevealInput> = {}): ProgressiveRevealInput => ({
  enabled: true,
  zoom: 11,
  nodes: [],
  workers: [],
  affinityOf: () => 0,
  ...over,
});

describe('quantiseZoom', () => {
  it('snaps to half levels so a pinch cannot re-rank every frame', () => {
    expect(quantiseZoom(13.24)).toBe(13);
    expect(quantiseZoom(13.3)).toBe(13.5);
    expect(quantiseZoom(undefined)).toBe(0);
  });
});

describe('computeReveal', () => {
  it('is inert when disabled, so drill and zoom mode are untouched', () => {
    // The load-bearing regression guard: those two modes must render exactly as
    // they did before this feature existed.
    expect(computeReveal(input({ enabled: false, nodes: [node('a', 0)] }))).toEqual(REVEAL_OFF);
  });

  it('promotes the troubled area over the calm ones it collides with', () => {
    const nodes = [
      node('calm-1', 0),
      node('outage', 1, { clocked_in: 0, tidak_hadir: 8 }),
      node('calm-2', 2),
    ];
    const { promotedNodes } = computeReveal(input({ nodes }));
    expect(promotedNodes?.has('outage')).toBe(true);
    expect(promotedNodes?.size).toBe(1);
  });

  it('lets affinity decide between equally calm areas', () => {
    const nodes = [node('ignored', 0), node('watched', 1)];
    const { promotedNodes } = computeReveal(
      input({ nodes, affinityOf: (id) => (id === 'watched' ? 2.5 : 0) })
    );
    expect(promotedNodes).toEqual(new Set(['watched']));
  });

  it('always draws the open node and the selected worker', () => {
    const nodes = [node('winner', 0, { clocked_in: 0, tidak_hadir: 9 }), node('open', 1)];
    const workers = [
      worker('busy', 0, { status: 'absent' }),
      worker('picked', 1),
    ];
    const reveal = computeReveal(
      input({ nodes, workers, exemptNodeIds: ['open'], exemptWorkerIds: ['picked'] })
    );
    expect(reveal.promotedNodes?.has('open')).toBe(true);
    expect(reveal.promotedWorkers?.has('picked')).toBe(true);
  });

  it('tolerates null and undefined exemptions', () => {
    // The caller passes `selectedId` and `openNodeId` straight through, and both
    // are null most of the time.
    const reveal = computeReveal(
      input({ nodes: [node('a', 0)], exemptNodeIds: [null, undefined], exemptWorkerIds: [null] })
    );
    expect(reveal.promotedNodes).toEqual(new Set(['a']));
  });

  it('ranks workers and nodes independently', () => {
    // A crowd of people must not push area pins off the map, and hiding the
    // Petugas layer must not reshuffle which kawasan are drawn.
    const nodes = [node('area', 0)];
    const crowded = Array.from({ length: 80 }, (_, i) => worker(`w${i}`, i, { status: 'absent' }));
    const reveal = computeReveal(input({ nodes, workers: crowded, zoom: 18 }));
    expect(reveal.promotedNodes).toEqual(new Set(['area']));
    expect(reveal.promotedWorkers!.size).toBeGreaterThan(1);
  });

  it('reveals more as the operator zooms in', () => {
    // The whole interaction, asserted end to end on one dataset.
    const nodes = Array.from({ length: 12 }, (_, i) => node(`n${i}`, i));
    const near = computeReveal(input({ nodes, zoom: 11 })).promotedNodes!.size;
    const closer = computeReveal(input({ nodes, zoom: 16 })).promotedNodes!.size;
    expect(closer).toBeGreaterThan(near);
  });

  it('never promotes more than the cap', () => {
    const nodes = Array.from({ length: 200 }, (_, i) => node(`n${i}`, i * 20));
    const { promotedNodes } = computeReveal(input({ nodes, zoom: 20, cap: 15 }));
    expect(promotedNodes!.size).toBeLessThanOrEqual(15);
  });
});
