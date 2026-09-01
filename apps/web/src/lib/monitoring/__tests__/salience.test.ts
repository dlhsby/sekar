/**
 * Salience scoring — which markers earn a full pin when the map has no room.
 *
 * The ordering assertions here ARE the product decision: a monitoring map ranks
 * by trouble first, familiarity second, tier last. Each test names the operator
 * question it answers.
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
    // "Nothing wrong here" must score nothing, so an empty-looking map is a
    // truthful signal rather than an artefact of the budget.
    expect(nodeUrgency(node())).toBe(0);
  });

  it('ranks nobody-showed-up above some-not-yet-here', () => {
    const absent = nodeUrgency(node({ clocked_in: 0, tidak_hadir: 8 }));
    const pending = nodeUrgency(node({ clocked_in: 0, belum_hadir: 8 }));
    expect(absent).toBeGreaterThan(pending);
  });

  it('ranks a bigger shortfall above a smaller one', () => {
    const worse = nodeUrgency(node({ scheduled: 8, clocked_in: 0, tidak_hadir: 8 }));
    const milder = nodeUrgency(node({ scheduled: 8, clocked_in: 6, tidak_hadir: 2 }));
    expect(worse).toBeGreaterThan(milder);
  });

  it('adds a penalty when literally nobody is on site', () => {
    // An 8-person area with 8 absent and a 1-person area with 1 absent are both
    // total outages; the flat term keeps the small one from disappearing.
    const totalOutage = nodeUrgency(node({ scheduled: 1, clocked_in: 0, tidak_hadir: 1 }));
    const partial = nodeUrgency(node({ scheduled: 8, clocked_in: 7, tidak_hadir: 1 }));
    expect(totalOutage).toBeGreaterThan(partial);
  });

  it('scores an area with nothing scheduled at the very bottom', () => {
    // Not a problem — nobody was meant to be there. It must never outrank a
    // real shortfall, and it is the first thing demoted to a dot.
    expect(nodeUrgency(node({ scheduled: 0, clocked_in: 0 }))).toBe(0);
  });
});

describe('workerUrgency', () => {
  it('is zero for someone active, on schedule and inside their area', () => {
    expect(workerUrgency(worker())).toBe(0);
  });

  it('ranks absent above stale-ping above merely off-schedule', () => {
    const absent = workerUrgency(worker({ status: 'absent' }));
    const stale = workerUrgency(worker({ status: 'offline' }));
    const offSchedule = workerUrgency(worker({ is_scheduled: false }));
    expect(absent).toBeGreaterThan(stale);
    expect(stale).toBeGreaterThan(offSchedule);
  });

  it('treats being outside the assigned area as a strong signal', () => {
    // The single most actionable thing on this map: someone is not where the
    // roster says they should be.
    expect(workerUrgency(worker({ is_within_area: false }))).toBeGreaterThan(
      workerUrgency(worker({ is_scheduled: false }))
    );
  });

  it('accumulates when several things are wrong at once', () => {
    const compound = workerUrgency(
      worker({ status: 'offline', is_within_area: false, is_scheduled: false })
    );
    expect(compound).toBeGreaterThan(workerUrgency(worker({ status: 'offline' })));
  });
});

describe('scoreNode / scoreWorker', () => {
  it('lets familiarity break a tie between two calm areas', () => {
    const familiar = scoreNode(node(), 2.5);
    const stranger = scoreNode(node(), 0);
    expect(familiar).toBeGreaterThan(stranger);
  });

  it('never lets familiarity outrank a real outage', () => {
    // THE safety property of the whole feature. A place you look at every day
    // must not push an area with nobody in it off the map.
    const belovedButCalm = scoreNode(node(), 3);
    const outage = scoreNode(node({ scheduled: 6, clocked_in: 0, tidak_hadir: 6 }), 0);
    expect(outage).toBeGreaterThan(belovedButCalm);
  });

  it('orders tiers rayon > kawasan > lokasi when all else is equal', () => {
    const rayon = scoreNode(node({ variant: 'district' }), 0);
    const kawasan = scoreNode(node({ variant: 'region' }), 0);
    const lokasi = scoreNode(node({ variant: 'location' }), 0);
    expect(rayon).toBeGreaterThan(kawasan);
    expect(kawasan).toBeGreaterThan(lokasi);
  });

  it('keeps the tier term small enough that trouble beats seniority', () => {
    // A lokasi with an outage must outrank a calm rayon, or the map would
    // always be a list of the eight rayon.
    const calmRayon = scoreNode(node({ variant: 'district' }), 0);
    const troubledLokasi = scoreNode(
      node({ variant: 'location', scheduled: 4, clocked_in: 0, tidak_hadir: 4 }),
      0
    );
    expect(troubledLokasi).toBeGreaterThan(calmRayon);
  });

  it('puts the Surabaya summary above every other node', () => {
    expect(TIER_BASE.surabaya).toBeGreaterThan(TIER_BASE.district);
  });

  it('is finite for absurd input', () => {
    // Counts arrive from the API; a NaN must degrade to "not urgent", never
    // poison the sort and scramble the whole map.
    const bad = scoreNode(node({ scheduled: NaN, clocked_in: NaN, tidak_hadir: NaN }), 0);
    expect(Number.isFinite(bad)).toBe(true);
  });

  it('scores workers with affinity the same way', () => {
    expect(scoreWorker(worker(), 2)).toBeGreaterThan(scoreWorker(worker(), 0));
  });
});
