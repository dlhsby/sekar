/**
 * Progressive reveal — the integration point of salience, affinity and grid.
 *
 * The tests that matter here are the ones about what must NOT change: drill and
 * zoom mode untouched, layers independent of each other, and the operator's
 * current selection always drawn.
 */
import { computeReveal, quantiseZoom, type ProgressiveRevealInput } from '../useProgressiveReveal';

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
  it('draws every marker when the pin pass is off, in drill and zoom mode', () => {
    // The load-bearing guard: those two modes must still draw every marker, its
    // count and its gesture. `promoted*` null is what callers read as "full pin".
    const r = computeReveal({
      ...input({ enabled: false, nodes: [node('a', 0)] }),
      workers: [worker('w', 0)],
    });
    expect(r.promotedNodes).toBeNull();
    expect(r.promotedWorkers).toBeNull();
  });

  it('still declutters LABELS when the pin pass is off', () => {
    // Pins are presence; labels are detail. Two names cannot occupy the same
    // pixels in any mode, and printing them anyway destroys information rather
    // than adding it — measured in drill mode, 40 labels gave 22 overlapping
    // pairs and neither name in a pair was readable.
    const crowd = Array.from({ length: 40 }, (_, i) => node(`n${i}`, i));
    const r = computeReveal(input({ enabled: false, nodes: crowd, zoom: 12 }));
    expect(r.labelledNodes).not.toBeNull();
    expect(r.labelledNodes!.size).toBeLessThan(crowd.length);
    expect(r.labelledNodes!.size).toBeGreaterThan(0);
  });

  it('labels from the FULL set when the pin pass is off, not from a promoted subset', () => {
    // With no pin pass every marker is drawn, so every marker is a label
    // candidate. Filtering by a promoted set that does not exist would label
    // nothing at all.
    const r = computeReveal(input({ enabled: false, nodes: [node('lonely', 0)] }));
    expect(r.labelledNodes).toEqual(new Set(['lonely']));
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

  it('never demotes a rayon — the frame must not develop holes', () => {
    // `zoomTiers` holds the rayon tier on at every zoom because it is the map's
    // frame; demotion follows the same rule. Without this, a label-width grid
    // put three of the eight rayon into shared cells at city zoom and drew them
    // as dots, leaving the operator with a partial frame.
    const rayon = Array.from({ length: 8 }, (_, i) =>
      // All stacked in ONE cell — the worst case the grid can produce.
      node(`r${i}`, 0, { variant: 'district' as const })
    );
    const { promotedNodes } = computeReveal(input({ nodes: rayon, zoom: 11 }));
    expect(promotedNodes!.size).toBe(8);
  });

  it('exempts the Surabaya summary too', () => {
    const nodes = [
      node('sby', 0, { variant: 'surabaya' as const }),
      node('busy', 0, { clocked_in: 0, tidak_hadir: 9 }),
    ];
    expect(computeReveal(input({ nodes, zoom: 11 })).promotedNodes!.has('sby')).toBe(true);
  });

  it('spends the cap on the tiers that actually crowd, not on the frame', () => {
    // The exemption must not eat the budget: rayon are drawn in addition to the
    // cap, not out of it, or a dense city would trade kawasan pins for frame.
    const rayon = Array.from({ length: 8 }, (_, i) =>
      node(`r${i}`, i * 40, { variant: 'district' as const })
    );
    const kawasan = Array.from({ length: 200 }, (_, i) => node(`k${i}`, i * 40));
    const { promotedNodes } = computeReveal(
      input({ nodes: [...rayon, ...kawasan], zoom: 20, cap: 10 })
    );
    expect(promotedNodes!.size).toBe(18); // 8 frame + 10 capped
  });

  it('labels a SUBSET of the pins it draws, never a dot', () => {
    // A name on a marker that is only a dot would be a label pointing at
    // nothing. The label pass runs over the promoted survivors for that reason.
    const nodes = Array.from({ length: 60 }, (_, i) => node(`n${i}`, i));
    const r = computeReveal(input({ nodes, zoom: 15 }));
    for (const id of r.labelledNodes!) expect(r.promotedNodes!.has(id)).toBe(true);
    expect(r.labelledNodes!.size).toBeLessThanOrEqual(r.promotedNodes!.size);
  });

  it('draws more pins than labels in a crowd — the point of the two passes', () => {
    // A pin is ~40px and its name ~150, so in a dense cluster many markers can
    // show their staffing count while only some can show their name. Gating both
    // on the label's box cost the rest their count for nothing.
    const crowd = Array.from({ length: 60 }, (_, i) => node(`n${i}`, i));
    const r = computeReveal(input({ nodes: crowd, zoom: 15 }));
    expect(r.promotedNodes!.size).toBeGreaterThan(r.labelledNodes!.size);
  });

  it('never demotes the label of whatever the sidebar is describing', () => {
    // The selected worker and the open node keep their names in every mode, for
    // the same reason they keep their pins: the card must not describe something
    // the map has left anonymous.
    const crowd = Array.from({ length: 40 }, (_, i) => node(`n${i}`, i));
    const r = computeReveal(
      input({ enabled: false, nodes: crowd, zoom: 12, exemptNodeIds: ['n39'] })
    );
    expect(r.labelledNodes!.has('n39')).toBe(true);
  });

  it('lets a rayon lose its NAME even though it never loses its pin', () => {
    // The frame exemption is about presence, not detail. A rayon must always be
    // drawn — it is how you know where you are — but its name may yield to a
    // neighbour that needs the space more.
    const stacked = [
      node('busy', 0, { clocked_in: 0, tidak_hadir: 9 }),
      node('rayon', 0, { variant: 'district' as const }),
    ];
    const r = computeReveal(input({ nodes: stacked, zoom: 11 }));
    expect(r.promotedNodes!.has('rayon')).toBe(true); // presence: always
    expect(r.labelledNodes!.size).toBe(1); // detail: only one name fits
  });

  it('never promotes more than the cap', () => {
    const nodes = Array.from({ length: 200 }, (_, i) => node(`n${i}`, i * 20));
    const { promotedNodes } = computeReveal(input({ nodes, zoom: 20, cap: 15 }));
    expect(promotedNodes!.size).toBeLessThanOrEqual(15);
  });
});
