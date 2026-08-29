/**
 * Progressive reveal — salience, affinity and separation combined.
 *
 * The tests that matter are the ones about what must NOT change: drill and zoom
 * still draw every marker, layers rank independently, and whatever the sheet is
 * describing is always drawn.
 */
import { computeReveal, quantiseZoom, type ProgressiveRevealInput } from '../progressiveReveal';

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
  it('draws every marker when the pin pass is off', () => {
    // Drill and zoom mode. `promoted*` null is what callers read as "full pin".
    const r = computeReveal(input({ enabled: false, nodes: [node('a', 0)] }));
    expect(r.promotedNodes).toBeNull();
    expect(r.promotedWorkers).toBeNull();
  });

  it('still declutters LABELS when the pin pass is off', () => {
    // Pins are presence; labels are detail. Two names cannot occupy the same
    // pixels in any mode, and printing them anyway destroys information.
    const crowd = Array.from({ length: 40 }, (_, i) => node(`n${i}`, i));
    const r = computeReveal(input({ enabled: false, nodes: crowd, zoom: 12 }));
    expect(r.labelledNodes).not.toBeNull();
    expect(r.labelledNodes!.size).toBeLessThan(crowd.length);
    expect(r.labelledNodes!.size).toBeGreaterThan(0);
  });

  it('promotes the troubled area over the calm ones it collides with', () => {
    const nodes = [
      node('calm-1', 0),
      node('outage', 1, { clocked_in: 0, tidak_hadir: 8 }),
      node('calm-2', 2),
    ];
    expect(computeReveal(input({ nodes })).promotedNodes).toEqual(new Set(['outage']));
  });

  it('lets affinity decide between equally calm areas', () => {
    const nodes = [node('ignored', 0), node('watched', 1)];
    const r = computeReveal(
      input({ nodes, affinityOf: (id: string) => (id === 'watched' ? 2.5 : 0) }),
    );
    expect(r.promotedNodes).toEqual(new Set(['watched']));
  });

  it('never demotes a rayon — the frame must not develop holes', () => {
    // `zoomTiers` holds the tier on at every span because it is the map's frame;
    // demotion follows the same rule or the frame develops holes.
    const rayon = Array.from({ length: 8 }, (_, i) =>
      node(`r${i}`, 0, { variant: 'district' as const }),
    );
    expect(computeReveal(input({ nodes: rayon })).promotedNodes!.size).toBe(8);
  });

  it('spends the cap on the tiers that crowd, not on the frame', () => {
    const rayon = Array.from({ length: 8 }, (_, i) =>
      node(`r${i}`, i * 40, { variant: 'district' as const }),
    );
    const kawasan = Array.from({ length: 200 }, (_, i) => node(`k${i}`, i * 40));
    const r = computeReveal(input({ nodes: [...rayon, ...kawasan], zoom: 20, cap: 10 }));
    expect(r.promotedNodes!.size).toBe(18);
  });

  it('lets a rayon lose its NAME even though it never loses its pin', () => {
    // The frame exemption is about presence, not detail.
    const stacked = [
      node('busy', 0, { clocked_in: 0, tidak_hadir: 9 }),
      node('rayon', 0, { variant: 'district' as const }),
    ];
    const r = computeReveal(input({ nodes: stacked }));
    expect(r.promotedNodes!.has('rayon')).toBe(true);
    expect(r.labelledNodes!.size).toBe(1);
  });

  it('labels a SUBSET of the pins it draws, never a dot', () => {
    const nodes = Array.from({ length: 60 }, (_, i) => node(`n${i}`, i));
    const r = computeReveal(input({ nodes, zoom: 15 }));
    for (const id of r.labelledNodes!) expect(r.promotedNodes!.has(id)).toBe(true);
  });

  it('draws more pins than labels in a crowd — the point of the two passes', () => {
    const crowd = Array.from({ length: 60 }, (_, i) => node(`n${i}`, i));
    const r = computeReveal(input({ nodes: crowd, zoom: 15 }));
    expect(r.promotedNodes!.size).toBeGreaterThan(r.labelledNodes!.size);
  });

  it('ranks workers and nodes independently', () => {
    // A crowd of people must not push area pins off the map.
    const nodes = [node('area', 0)];
    const crowded = Array.from({ length: 80 }, (_, i) => worker(`w${i}`, i, { status: 'absent' }));
    const r = computeReveal(input({ nodes, workers: crowded, zoom: 18 }));
    expect(r.promotedNodes).toEqual(new Set(['area']));
    expect(r.promotedWorkers!.size).toBeGreaterThan(1);
  });

  it('always draws whatever the sheet is describing', () => {
    const nodes = [node('winner', 0, { clocked_in: 0, tidak_hadir: 9 }), node('open', 1)];
    const workers = [worker('busy', 0, { status: 'absent' }), worker('picked', 1)];
    const r = computeReveal(
      input({ nodes, workers, exemptNodeIds: ['open'], exemptWorkerIds: ['picked'] }),
    );
    expect(r.promotedNodes!.has('open')).toBe(true);
    expect(r.promotedWorkers!.has('picked')).toBe(true);
  });

  it('tolerates null and undefined exemptions', () => {
    const r = computeReveal(
      input({ nodes: [node('a', 0)], exemptNodeIds: [null, undefined], exemptWorkerIds: [null] }),
    );
    expect(r.promotedNodes).toEqual(new Set(['a']));
  });

  it('reveals more as the camera moves in', () => {
    const nodes = Array.from({ length: 12 }, (_, i) => node(`n${i}`, i));
    expect(computeReveal(input({ nodes, zoom: 16 })).promotedNodes!.size).toBeGreaterThan(
      computeReveal(input({ nodes, zoom: 11 })).promotedNodes!.size,
    );
  });
});
