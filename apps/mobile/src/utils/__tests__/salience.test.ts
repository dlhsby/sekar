/**
 * Salience scoring — which markers earn a full pin when the map has no room.
 *
 * The ordering assertions ARE the product decision: a monitoring map ranks by
 * trouble first, familiarity second, tier last. Weights are copied from web
 * verbatim so the two platforms cannot rank the same data differently.
 */
import {
  nodeUrgency,
  workerUrgency,
  scoreNode,
  scoreWorker,
  TIER_BASE,
  type SalienceNode,
  type SalienceWorker,
} from '../salience';

const node = (over: Partial<SalienceNode> = {}): SalienceNode => ({
  variant: 'region',
  scheduled: 8,
  clocked_in: 8,
  belum_hadir: 0,
  tidak_hadir: 0,
  ...over,
});

const worker = (over: Partial<SalienceWorker> = {}): SalienceWorker => ({
  status: 'active',
  is_within_area: true,
  is_scheduled: true,
  ...over,
});

describe('nodeUrgency', () => {
  it('is zero for a fully staffed area', () => {
    // "Nothing wrong here" scores nothing, so an empty-looking map is a truthful
    // signal rather than an artefact of the budget.
    expect(nodeUrgency(node())).toBe(0);
  });

  it('ranks nobody-showed-up above some-not-yet-here', () => {
    expect(nodeUrgency(node({ clocked_in: 0, tidak_hadir: 8 }))).toBeGreaterThan(
      nodeUrgency(node({ clocked_in: 0, belum_hadir: 8 })),
    );
  });

  it('ranks a bigger shortfall above a smaller one', () => {
    expect(nodeUrgency(node({ clocked_in: 0, tidak_hadir: 8 }))).toBeGreaterThan(
      nodeUrgency(node({ clocked_in: 6, tidak_hadir: 2 })),
    );
  });

  it('adds a penalty when literally nobody is on site', () => {
    // Without the flat term a one-person site standing empty scores the same as
    // an eight-person site missing one, and small total outages vanish.
    expect(nodeUrgency(node({ scheduled: 1, clocked_in: 0, tidak_hadir: 1 }))).toBeGreaterThan(
      nodeUrgency(node({ scheduled: 8, clocked_in: 7, tidak_hadir: 1 })),
    );
  });

  it('scores an area with nothing scheduled at the very bottom', () => {
    // Not a problem — nobody was meant to be there.
    expect(nodeUrgency(node({ scheduled: 0, clocked_in: 0 }))).toBe(0);
  });
});

describe('workerUrgency', () => {
  it('is zero for someone active, on schedule and inside their area', () => {
    expect(workerUrgency(worker())).toBe(0);
  });

  it('ranks absent above stale-ping above merely off-schedule', () => {
    expect(workerUrgency(worker({ status: 'absent' }))).toBeGreaterThan(
      workerUrgency(worker({ status: 'offline' })),
    );
    expect(workerUrgency(worker({ status: 'offline' }))).toBeGreaterThan(
      workerUrgency(worker({ is_scheduled: false })),
    );
  });

  it('treats being outside the assigned area as a strong signal', () => {
    // The single most actionable thing on this map: someone is not where the
    // roster says they should be.
    expect(workerUrgency(worker({ is_within_area: false }))).toBeGreaterThan(
      workerUrgency(worker({ is_scheduled: false })),
    );
  });

  it('accumulates when several things are wrong at once', () => {
    expect(
      workerUrgency(worker({ status: 'offline', is_within_area: false, is_scheduled: false })),
    ).toBeGreaterThan(workerUrgency(worker({ status: 'offline' })));
  });
});

describe('scoreNode / scoreWorker', () => {
  it('never lets familiarity outrank a real outage', () => {
    // THE safety property of the whole feature. A place you look at every day
    // must not push an area with nobody in it off the map.
    expect(scoreNode(node({ scheduled: 6, clocked_in: 0, tidak_hadir: 6 }), 0)).toBeGreaterThan(
      scoreNode(node(), 3),
    );
  });

  it('lets familiarity break a tie between two calm areas', () => {
    expect(scoreNode(node(), 2.5)).toBeGreaterThan(scoreNode(node(), 0));
  });

  it('orders tiers rayon > kawasan > lokasi when all else is equal', () => {
    expect(TIER_BASE.district).toBeGreaterThan(TIER_BASE.region);
    expect(TIER_BASE.region).toBeGreaterThan(TIER_BASE.location);
    expect(TIER_BASE.surabaya).toBeGreaterThan(TIER_BASE.district);
  });

  it('keeps the tier term small enough that trouble beats seniority', () => {
    // A lokasi with an outage must outrank a calm rayon, or the map would
    // always be a list of the eight rayon.
    expect(
      scoreNode(node({ variant: 'location', scheduled: 4, clocked_in: 0, tidak_hadir: 4 }), 0),
    ).toBeGreaterThan(scoreNode(node({ variant: 'district' }), 0));
  });

  it('is finite for absurd input', () => {
    // Counts arrive from the API; a NaN must degrade to "not urgent", never
    // poison the sort and scramble the whole map.
    expect(
      Number.isFinite(scoreNode(node({ scheduled: NaN, clocked_in: NaN, tidak_hadir: NaN }), 0)),
    ).toBe(true);
  });

  it('scores workers with affinity the same way', () => {
    expect(scoreWorker(worker(), 2)).toBeGreaterThan(scoreWorker(worker(), 0));
  });
});
