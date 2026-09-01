# Slice 1 — Mobile map: progressive reveal, scope-aware tiers, label declutter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`)
> syntax for tracking.

**Goal:** Give the mobile monitoring map the same ranked marker reveal the web map got in PR #463, and
retire distance-based clustering in favour of it.

**Architecture:** Port web's four pure modules (`mercator`, `salience`, `affinity`, `declutter`) to
`apps/mobile/src/utils/`, unchanged in logic. The one genuine adaptation is the camera model: web ranks
against a Google zoom level, mobile's camera reports `latitudeDelta`, so a conversion sits between
`viewportBox` and the projection. Everything downstream then works in pixels exactly as web does.
`ClusteredUserMarkers` is deleted; `UserMarker` gains a dot form.

**Tech Stack:** React Native 0.83 · `react-native-maps` · Redux Toolkit · Jest + React Native Testing
Library · TypeScript 5.9

**Spec:** [`specs/features/monitoring/PARITY.md`](../PARITY.md) — gaps M1, M2, M3, and the clustering
decision in §5.

## Global Constraints

- **Role values are lowercase**, matching the backend enum. Never Pascal case.
- **Every user-facing string is localised** via `react-i18next`, added to BOTH
  `apps/mobile/src/i18n/locales/{id,en}/monitoring.json` with identical key sets. Verify with
  `npm run i18n:check` from the repo root.
- **Immutability:** never mutate inputs; return new objects/arrays.
- **No `console.log`** in committed code. `console.warn` for genuine operator-visible faults only.
- **Files < 800 lines, functions < 50 lines, nesting < 4 levels.**
- **Coverage ≥ 80%.** TDD throughout: failing test → minimal implementation → refactor.
- **Commit format:** `<type>: <description>` — feat, fix, refactor, docs, test, chore, perf, ci.
- **Branch:** `feat/mobile-monitoring-reveal`, cut from `main`. Feature branch → PR → `main`.
- **Same-PR spec mandate:** prepend one line to `specs/features/monitoring/CHANGELOG.md`; update
  `PARITY.md` rows M1/M2/M3 to done.
- **Verify before commit** in `apps/mobile`: `npx tsc --noEmit`, `npm run lint`, `npm test`.

---

## File Structure

**Create (mobile):**

| File | Responsibility |
|---|---|
| `apps/mobile/src/utils/mercator.ts` | lat/lng → pixels, and `deltaToZoom` (the camera-model bridge) |
| `apps/mobile/src/utils/salience.ts` | urgency + affinity + tier → one score |
| `apps/mobile/src/utils/affinity.ts` | per-device "places this operator watches", decayed and bounded |
| `apps/mobile/src/utils/declutter.ts` | pixel separation with a spatial index, capped |
| `apps/mobile/src/utils/progressiveReveal.ts` | combines the four; returns promoted + labelled sets |

**Modify (mobile):**

| File | Change |
|---|---|
| `src/utils/zoomTiers.ts` | add `tiersFor({ latitudeDelta, scope })` — drilling reveals the subtree |
| `src/components/monitoring/UserMarker.tsx` | add a `demoted` dot form |
| `src/components/monitoring/AggregateBubbleLayer.tsx` | accept `promoted` / `labelled` sets |
| `src/screens/monitoring/components/MapLayerContent.tsx` | compute the reveal, pass the sets down |
| `src/screens/monitoring/hooks/useLiveUsersFiltering.ts` | use `tiersFor` |

**Delete (mobile):** `src/components/monitoring/ClusteredUserMarkers.tsx`,
`src/components/monitoring/ClusterMarker.tsx`, and their tests.

**Why `utils/` and not a new `lib/monitoring/`:** mobile already keeps `zoomTiers.ts`,
`monitoringScope.ts` and `viewportBox.ts` in `src/utils/`. Follow the established pattern rather than
introducing a parallel tree that mirrors web's layout for its own sake.

---

## Task 1: Mercator projection and the camera bridge

**Files:**
- Create: `apps/mobile/src/utils/mercator.ts`
- Test: `apps/mobile/src/utils/__tests__/mercator.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TILE_SIZE: number`, `PixelPoint { x: number; y: number }`,
  `projectToPixel(lat: number, lng: number, zoom: number): PixelPoint`,
  `deltaToZoom(longitudeDelta: number, viewportWidthPx: number): number`.

**Why a bridge is needed:** web ranks against Google's zoom level. `react-native-maps` reports a camera
`Region` with `latitudeDelta` / `longitudeDelta`. Collision must be measured in device pixels, so the
span has to become a zoom level first. Everything downstream is then identical to web.

- [ ] **Step 1: Write the failing test**

```ts
import { projectToPixel, deltaToZoom, TILE_SIZE } from '../mercator';

describe('projectToPixel', () => {
  it('puts null island at the centre of the zoom-0 world tile', () => {
    expect(projectToPixel(0, 0, 0)).toEqual({ x: TILE_SIZE / 2, y: TILE_SIZE / 2 });
  });

  it('doubles the world with each zoom level', () => {
    expect(projectToPixel(0, 180, 1).x).toBeCloseTo(projectToPixel(0, 180, 0).x * 2, 6);
  });

  it('clamps the poles instead of returning Infinity', () => {
    // ln((1+sin)/(1-sin)) diverges at ±90°. Unclamped, every grid cell downstream
    // becomes NaN.
    for (const lat of [90, -90, 89.9999]) {
      expect(Number.isFinite(projectToPixel(lat, 0, 3).y)).toBe(true);
    }
  });

  it('places Surabaya at a stable pixel for a given zoom', () => {
    const p = projectToPixel(-7.2575, 112.7521, 12);
    expect(p.x).toBeCloseTo(852702.29, 1);
    expect(p.y).toBeCloseTo(545483.76, 1);
  });
});

describe('deltaToZoom', () => {
  it('maps a full-world span to zoom 0 on a one-tile-wide viewport', () => {
    expect(deltaToZoom(360, TILE_SIZE)).toBeCloseTo(0, 6);
  });

  it('gains a zoom level each time the span halves', () => {
    const wide = deltaToZoom(0.08, 390);
    const half = deltaToZoom(0.04, 390);
    expect(half - wide).toBeCloseTo(1, 6);
  });

  it('never returns a negative or non-finite zoom', () => {
    // A zero or absent delta arrives on the first frame, before the camera
    // reports. It must degrade to "zoomed all the way out", not to NaN.
    for (const d of [0, -1, NaN, Infinity]) {
      const z = deltaToZoom(d, 390);
      expect(Number.isFinite(z)).toBe(true);
      expect(z).toBeGreaterThanOrEqual(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/utils/__tests__/mercator.test.ts`
Expected: FAIL — `Cannot find module '../mercator'`

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * Web Mercator projection, plus the bridge from this platform's camera model.
 *
 * Marker collision is a SCREEN-space question: two kawasan 200 m apart overlap
 * when the camera spans the city and sit far apart when it spans a street. So
 * ranking needs pixels — and on mobile, getting to pixels needs one extra step
 * that web does not, because `react-native-maps` reports a coordinate SPAN
 * (`latitudeDelta` / `longitudeDelta`) where Google's web SDK reports a zoom
 * level. `deltaToZoom` is that step; everything after it is identical to web's
 * `lib/monitoring/mercator.ts`, deliberately, so the two cannot drift.
 */

/** Google's world is one 256×256 tile at zoom 0; each level doubles it. */
export const TILE_SIZE = 256;

/** Mercator's standard cutoff. The y term diverges at the poles. */
const MAX_LATITUDE = 85.05112878;

export interface PixelPoint {
  x: number;
  y: number;
}

const clamp = (n: number, min: number, max: number): number => Math.min(Math.max(n, min), max);

/** Project a coordinate to absolute pixels at `zoom`. Only DIFFERENCES are meaningful. */
export function projectToPixel(lat: number, lng: number, zoom: number): PixelPoint {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const sinY = Math.sin((clamp(lat, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180);
  return {
    x: scale * (0.5 + lng / 360),
    y: scale * (0.5 - Math.log((1 + sinY) / (1 - sinY)) / (4 * Math.PI)),
  };
}

/**
 * Camera span → zoom level.
 *
 * At zoom z the world is `TILE_SIZE · 2^z` pixels wide and spans 360°, so a
 * viewport `widthPx` wide showing `longitudeDelta` degrees satisfies
 * `widthPx / (TILE_SIZE · 2^z) = longitudeDelta / 360`.
 *
 * Degenerate spans (zero, negative, absent) arrive on the first frame before the
 * camera reports one. They floor at 0 — "zoomed all the way out" — rather than
 * producing a NaN that would poison every collision test downstream.
 */
export function deltaToZoom(longitudeDelta: number, viewportWidthPx: number): number {
  const span = Math.abs(longitudeDelta);
  if (!Number.isFinite(span) || span <= 0) return 0;
  const z = Math.log2((360 * viewportWidthPx) / (TILE_SIZE * span));
  return Number.isFinite(z) ? Math.max(0, z) : 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/utils/__tests__/mercator.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/utils/mercator.ts apps/mobile/src/utils/__tests__/mercator.test.ts
git commit -m "feat(mobile): project coordinates to pixels, and bridge the camera model"
```

---

## Task 2: Salience scoring

**Files:**
- Create: `apps/mobile/src/utils/salience.ts`
- Test: `apps/mobile/src/utils/__tests__/salience.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SalienceNode { variant: 'district' | 'location' | 'region' | 'surabaya'; scheduled: number;
  clocked_in: number; belum_hadir: number; tidak_hadir: number }`,
  `SalienceWorker { status: string; is_within_area: boolean; is_scheduled: boolean }`,
  `TIER_BASE`, `nodeUrgency(n)`, `workerUrgency(w)`, `scoreNode(n, affinity)`, `scoreWorker(w, affinity)`.

**Weights are copied from web verbatim.** They are a product decision already made and reviewed; mobile
re-deriving them would let the two platforms rank the same data differently.

- [ ] **Step 1: Write the failing test**

```ts
import { nodeUrgency, workerUrgency, scoreNode, scoreWorker, TIER_BASE } from '../salience';

const node = (over = {}) => ({
  variant: 'region' as const,
  scheduled: 8, clocked_in: 8, belum_hadir: 0, tidak_hadir: 0,
  ...over,
});
const worker = (over = {}) => ({
  status: 'active', is_within_area: true, is_scheduled: true, ...over,
});

describe('nodeUrgency', () => {
  it('is zero for a fully staffed area', () => {
    // "Nothing wrong here" scores nothing, so an empty-looking map is a truthful
    // signal rather than an artefact of the budget.
    expect(nodeUrgency(node())).toBe(0);
  });

  it('ranks nobody-showed-up above some-not-yet-here', () => {
    expect(nodeUrgency(node({ clocked_in: 0, tidak_hadir: 8 })))
      .toBeGreaterThan(nodeUrgency(node({ clocked_in: 0, belum_hadir: 8 })));
  });

  it('adds a penalty when literally nobody is on site', () => {
    // Without the flat term a one-person site standing empty scores the same as
    // an eight-person site missing one, and small total outages vanish.
    expect(nodeUrgency(node({ scheduled: 1, clocked_in: 0, tidak_hadir: 1 })))
      .toBeGreaterThan(nodeUrgency(node({ scheduled: 8, clocked_in: 7, tidak_hadir: 1 })));
  });

  it('scores an area with nothing scheduled at the very bottom', () => {
    expect(nodeUrgency(node({ scheduled: 0, clocked_in: 0 }))).toBe(0);
  });
});

describe('workerUrgency', () => {
  it('is zero for someone active, on schedule and inside their area', () => {
    expect(workerUrgency(worker())).toBe(0);
  });

  it('ranks absent above stale-ping above merely off-schedule', () => {
    expect(workerUrgency(worker({ status: 'absent' })))
      .toBeGreaterThan(workerUrgency(worker({ status: 'offline' })));
    expect(workerUrgency(worker({ status: 'offline' })))
      .toBeGreaterThan(workerUrgency(worker({ is_scheduled: false })));
  });

  it('treats being outside the assigned area as a strong signal', () => {
    expect(workerUrgency(worker({ is_within_area: false })))
      .toBeGreaterThan(workerUrgency(worker({ is_scheduled: false })));
  });
});

describe('scoreNode / scoreWorker', () => {
  it('never lets familiarity outrank a real outage', () => {
    // THE safety property. A place you look at every day must not push an area
    // with nobody in it off the map.
    expect(scoreNode(node({ scheduled: 6, clocked_in: 0, tidak_hadir: 6 }), 0))
      .toBeGreaterThan(scoreNode(node(), 3));
  });

  it('lets familiarity break a tie between two calm areas', () => {
    expect(scoreNode(node(), 2.5)).toBeGreaterThan(scoreNode(node(), 0));
  });

  it('keeps the tier term small enough that trouble beats seniority', () => {
    expect(scoreNode(node({ variant: 'location', scheduled: 4, clocked_in: 0, tidak_hadir: 4 }), 0))
      .toBeGreaterThan(scoreNode(node({ variant: 'district' }), 0));
  });

  it('orders tiers rayon > kawasan > lokasi when all else is equal', () => {
    expect(TIER_BASE.district).toBeGreaterThan(TIER_BASE.region);
    expect(TIER_BASE.region).toBeGreaterThan(TIER_BASE.location);
  });

  it('is finite for absurd input', () => {
    // Counts arrive from the API; a NaN must degrade to "not urgent", never
    // poison the sort and scramble the whole map.
    expect(Number.isFinite(scoreNode(node({ scheduled: NaN, tidak_hadir: NaN }), 0))).toBe(true);
  });

  it('scores workers with affinity the same way', () => {
    expect(scoreWorker(worker(), 2)).toBeGreaterThan(scoreWorker(worker(), 0));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/utils/__tests__/salience.test.ts`
Expected: FAIL — `Cannot find module '../salience'`

- [ ] **Step 3: Write minimal implementation**

Copy `apps/web/src/lib/monitoring/salience.ts` verbatim — it has no web-specific imports. Keep its
docblocks; they carry the reasoning for each weight. The file compiles unchanged under the mobile
tsconfig.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/utils/__tests__/salience.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/utils/salience.ts apps/mobile/src/utils/__tests__/salience.test.ts
git commit -m "feat(mobile): score markers by urgency, so the map ranks trouble first"
```

---

## Task 3: Per-device affinity

**Files:**
- Create: `apps/mobile/src/utils/affinity.ts`
- Test: `apps/mobile/src/utils/__tests__/affinity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `AffinityStore = Record<string, number[]>`, `AFFINITY_KEY`, `HALF_LIFE_DAYS`,
  `MAX_AFFINITY`, `VISITS_PER_ENTITY`, `MAX_TRACKED_ENTITIES`, `MAX_AGE_DAYS`,
  `affinityScore(visits, now)`, `recordVisit(store, id, now)`, `pruneStore(store, now)`,
  `useAffinity(): { affinityOf(id): number; visit(id): void }`.

**The one platform difference:** web persists to `localStorage` synchronously. Mobile uses
`AsyncStorage`, which is a promise — so the hook loads once on mount and writes fire-and-forget on
visit. The pure functions are identical.

**Storage choice:** `AsyncStorage`, not `EncryptedStorage`. This is a workspace preference, not a
credential, and it sits alongside the offline queue rather than the tokens.

- [ ] **Step 1: Write the failing test**

```ts
import {
  affinityScore, recordVisit, pruneStore,
  MAX_AFFINITY, HALF_LIFE_DAYS, MAX_TRACKED_ENTITIES, type AffinityStore,
} from '../affinity';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 28, 12, 0, 0);

describe('affinityScore', () => {
  it('is zero for somewhere never visited', () => {
    expect(affinityScore(undefined, NOW)).toBe(0);
    expect(affinityScore([], NOW)).toBe(0);
  });

  it('halves over the half-life', () => {
    expect(affinityScore([NOW - HALF_LIFE_DAYS * DAY], NOW))
      .toBeCloseTo(affinityScore([NOW], NOW) / 2, 6);
  });

  it('rewards repeat visits, not just recency', () => {
    expect(affinityScore([NOW - DAY, NOW - 2 * DAY], NOW))
      .toBeGreaterThan(affinityScore([NOW - DAY], NOW));
  });

  it('never exceeds the ceiling, however obsessive the operator', () => {
    // THE safety property: urgency reaches ~20 on a real outage, so a bounded
    // affinity can break ties between quiet areas and nothing more.
    const obsessive = Array.from({ length: 500 }, (_, i) => NOW - i * 60_000);
    expect(affinityScore(obsessive, NOW)).toBeLessThanOrEqual(MAX_AFFINITY);
  });

  it('ignores timestamps from the future', () => {
    // Clock skew or a hand-edited store must not mint unbounded score.
    expect(affinityScore([NOW + 10 * DAY], NOW)).toBeLessThanOrEqual(affinityScore([NOW], NOW) + 1e-9);
  });
});

describe('recordVisit', () => {
  it('returns a new store and never mutates the input', () => {
    const before: AffinityStore = { a: [1] };
    const after = recordVisit(before, 'a', NOW);
    expect(before).toEqual({ a: [1] });
    expect(after.a).toContain(NOW);
  });

  it('caps the visit list per entity so storage cannot grow without bound', () => {
    let store: AffinityStore = {};
    for (let i = 0; i < 200; i++) store = recordVisit(store, 'a', NOW - i * 1000);
    expect(store.a.length).toBeLessThanOrEqual(20);
  });
});

describe('pruneStore', () => {
  it('drops entities not touched in a long time', () => {
    const pruned = pruneStore({ stale: [NOW - 400 * DAY], fresh: [NOW - DAY] }, NOW);
    expect(pruned.fresh).toBeDefined();
    expect(pruned.stale).toBeUndefined();
  });

  it('keeps only the most recently used entities when over the cap', () => {
    const store: AffinityStore = {};
    for (let i = 0; i < MAX_TRACKED_ENTITIES + 50; i++) store[`e${i}`] = [NOW - i * 1000];
    const pruned = pruneStore(store, NOW);
    expect(Object.keys(pruned).length).toBe(MAX_TRACKED_ENTITIES);
    expect(pruned.e0).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/utils/__tests__/affinity.test.ts`
Expected: FAIL — `Cannot find module '../affinity'`

- [ ] **Step 3: Write minimal implementation**

Copy the pure functions from `apps/web/src/lib/monitoring/affinity.ts` verbatim. Replace only the hook's
storage calls:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Affinity for this device.
 *
 * Loaded once on mount and written fire-and-forget on visit. `AsyncStorage` is a
 * promise where web's `localStorage` is synchronous, so `commit` cannot be part
 * of the render path — and it does not need to be: losing the last visit to a
 * backgrounded app costs the operator a tie-break, never data.
 *
 * The live store rides a ref as well as state, so a visit recorded from a marker
 * callback reads the CURRENT store rather than the one captured when the
 * callback was created.
 */
export function useAffinity(): AffinityApi {
  const [snapshot, setSnapshot] = useState<{ store: AffinityStore; at: number }>({ store: {}, at: 0 });
  const storeRef = useRef<AffinityStore>({});

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(AFFINITY_KEY)
      .then((raw) => {
        if (cancelled) return;
        const now = Date.now();
        const loaded = pruneStore(parseStore(raw), now);
        storeRef.current = loaded;
        setSnapshot({ store: loaded, at: now });
      })
      .catch(() => {
        // A device that cannot read its own preferences still gets a map.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visit = useCallback((id: string) => {
    if (!id) return;
    const now = Date.now();
    const next = pruneStore(recordVisit(storeRef.current, id, now), now);
    storeRef.current = next;
    setSnapshot({ store: next, at: now });
    void AsyncStorage.setItem(AFFINITY_KEY, JSON.stringify(next)).catch(() => {
      // Persisting is best-effort; the in-memory store is already updated.
    });
  }, []);

  const affinityOf = useCallback(
    (id: string) => affinityScore(snapshot.store[id], snapshot.at),
    [snapshot],
  );

  return { affinityOf, visit };
}
```

Export `parseStore(raw: string | null): AffinityStore` as the sanitising reader (same body as web's
`readStored`, minus the `window` guard).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/utils/__tests__/affinity.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/utils/affinity.ts apps/mobile/src/utils/__tests__/affinity.test.ts
git commit -m "feat(mobile): remember which places this operator watches"
```

---

## Task 4: Separation-based decluttering

**Files:**
- Create: `apps/mobile/src/utils/declutter.ts`
- Test: `apps/mobile/src/utils/__tests__/declutter.test.ts`

**Interfaces:**
- Consumes: `projectToPixel` from Task 1.
- Produces: `DeclutterCandidate { id: string; lat: number; lng: number; score: number }`,
  `DeclutterOptions { zoom: number; cellX?: number; cellY?: number; cap?: number; exempt?: Iterable<string> }`,
  `declutter(candidates, options): Set<string>`,
  `DEFAULT_CELL_X`, `DEFAULT_CELL_Y`, `PIN_CELL_X`, `PIN_CELL_Y`, `DEFAULT_CAP`.

**Constants differ from web and are provisional.** A phone viewport is roughly a third of a laptop's
width, so web's `150×96` box and cap of 45 would leave almost nothing on screen. Start at `110×72` and
a cap of `24`, and **measure in Task 8** — web's own constants were retuned twice after being seen
rendered, and guessing them here would repeat that.

- [ ] **Step 1: Write the failing test**

```ts
import { declutter, DEFAULT_CELL_X, DEFAULT_CELL_Y, DEFAULT_CAP, PIN_CELL_X } from '../declutter';

const BASE_LAT = -7.2575;
const BASE_LNG = 112.7521;
const at = (id: string, lat: number, lng: number, score: number) => ({ id, lat, lng, score });

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
  });

  it('measures DISTANCE, not cell membership', () => {
    // A grid leaks: two markers inside the separation box that straddle a cell
    // boundary land in different cells and both survive. Swept across more than
    // a full box width so the pair lands on every phase.
    const PX = 360 / (256 * 2 ** 14);
    for (let i = 0; i < 30; i++) {
      const lng = BASE_LNG + i * 6 * PX;
      const pair = [at('a', BASE_LAT, lng, 2), at('b', BASE_LAT, lng + (PIN_CELL_X - 6) * PX, 1)];
      expect(declutter(pair, { zoom: 14, cellX: PIN_CELL_X }).size).toBe(1);
    }
  });

  it('honours the global cap, keeping the highest scores', () => {
    const many = Array.from({ length: 50 }, (_, i) => at(`n${i}`, BASE_LAT + i * 0.05, BASE_LNG, i));
    const promoted = declutter(many, { zoom: 14, cap: 5 });
    expect(promoted.size).toBe(5);
    expect(promoted.has('n49')).toBe(true);
  });

  it('always promotes an exempt marker, even when it loses its space', () => {
    const stacked = [at('winner', BASE_LAT, BASE_LNG, 99), at('sel', BASE_LAT + 0.00001, BASE_LNG, 0)];
    const promoted = declutter(stacked, { zoom: 11, exempt: ['sel'] });
    expect(promoted.has('sel')).toBe(true);
    expect(promoted.has('winner')).toBe(true);
  });

  it('skips markers with unusable coordinates', () => {
    const mixed = [at('good', BASE_LAT, BASE_LNG, 1), at('bad', NaN, BASE_LNG, 99)];
    expect(declutter(mixed, { zoom: 14 })).toEqual(new Set(['good']));
  });

  it('does not mutate or reorder its input', () => {
    const input = [at('b', BASE_LAT, BASE_LNG, 1), at('a', BASE_LAT + 0.2, BASE_LNG, 9)];
    declutter(input, { zoom: 14 });
    expect(input[0].id).toBe('b');
  });

  it('exposes a box wider than it is tall, sized for a phone', () => {
    // The collision axis for a labelled marker is horizontal: the pin is ~36pt,
    // its name runs past 100. And a phone viewport is about a third of a
    // laptop's, so web's numbers would leave almost nothing drawn.
    expect(DEFAULT_CELL_X).toBeGreaterThan(DEFAULT_CELL_Y);
    expect(DEFAULT_CAP).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/utils/__tests__/declutter.test.ts`
Expected: FAIL — `Cannot find module '../declutter'`

- [ ] **Step 3: Write minimal implementation**

Copy `apps/web/src/lib/monitoring/declutter.ts` verbatim, changing only the import path
(`./mercator`) and these constants:

```ts
/**
 * Separation between two full pins, in device-independent pixels.
 *
 * Wider than tall for the same reason as web — the pin is ~36pt across and its
 * name runs past 100, so the axis that collides is horizontal — but SMALLER than
 * web's 150×96, because a phone viewport is roughly a third of a laptop's and
 * web's numbers would leave three markers on screen.
 *
 * Provisional. Measure against a real device before treating these as settled;
 * web's own pair was retuned twice after being seen rendered.
 */
export const DEFAULT_CELL_X = 110;
export const DEFAULT_CELL_Y = 72;

/** Separation for the PIN alone, when its name is not drawn. */
export const PIN_CELL_X = 44;
export const PIN_CELL_Y = 44;

/** Ceiling on promoted markers per layer, per the smaller viewport. */
export const DEFAULT_CAP = 24;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/utils/__tests__/declutter.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/utils/declutter.ts apps/mobile/src/utils/__tests__/declutter.test.ts
git commit -m "feat(mobile): declutter markers by measured separation, not by grid cell"
```

---

## Task 5: Scope-aware tier admission

**Files:**
- Modify: `apps/mobile/src/utils/zoomTiers.ts`
- Test: `apps/mobile/src/utils/__tests__/zoomTiers.test.ts` (extend)

**Interfaces:**
- Consumes: existing `tiersAtDelta`, `TierVisibility`, `ALL_TIERS`.
- Produces: `TierScope = 'surabaya' | 'city' | 'district' | 'region' | 'location'`,
  `tiersFor({ latitudeDelta, scope }): TierVisibility`, and `nextTierAtDelta(latitudeDelta, scope?)`
  gaining its second parameter.

**The defect this fixes (M2):** a rayon that spans the whole city leaves the camera at a city-wide span
after drilling into it, so `tiersAtDelta` admits nothing below rayon and the map shows an empty area
behind a "zoom in" hint. Drilling in IS the request to see inside.

- [ ] **Step 1: Write the failing test**

```ts
import { tiersAtDelta, tiersFor, nextTierAtDelta, TIER_DELTA } from '../zoomTiers';

describe('tiersFor — drilling in overrides the span gate', () => {
  it('reveals the whole subtree once the operator has drilled in', () => {
    // "Rayon Taman Aktif" spans the city, so drilling into it leaves the camera
    // wide and the gate hid all 42 of its lokasi behind a "zoom in" hint.
    expect(tiersFor({ latitudeDelta: 0.3, scope: 'district' })).toEqual({
      district: true, region: true, location: true, workers: true,
    });
  });

  it('applies at every drilled scope, not just district', () => {
    for (const scope of ['district', 'region', 'location'] as const) {
      expect(tiersFor({ latitudeDelta: 0.3, scope }).location).toBe(true);
    }
  });

  it('keeps the span gate at city scope, where the subtree is the whole city', () => {
    expect(tiersFor({ latitudeDelta: 0.3, scope: 'city' })).toEqual(tiersAtDelta(0.3));
    expect(tiersFor({ latitudeDelta: 0.01, scope: 'city' })).toEqual(tiersAtDelta(0.01));
  });

  it('keeps the span gate at the Surabaya summary too', () => {
    expect(tiersFor({ latitudeDelta: 0.3, scope: 'surabaya' }).region).toBe(false);
  });
});

describe('nextTierAtDelta with scope', () => {
  it('stops promising a tier that drilling has already revealed', () => {
    // Otherwise the hint reads "zoom in to see lokasi" while they are on screen.
    expect(nextTierAtDelta(0.3, 'district')).toBeNull();
  });

  it('still guides the operator at city scope', () => {
    expect(nextTierAtDelta(0.3, 'city')).toBe('region');
  });

  it('defaults to the span-only rule when no scope is given', () => {
    expect(nextTierAtDelta(0.3)).toBe('region');
    expect(nextTierAtDelta(TIER_DELTA.location)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/utils/__tests__/zoomTiers.test.ts`
Expected: FAIL — `tiersFor is not a function`

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * Drill scope, as far as tier admission is concerned. Only the distinction
 * between "looking at the whole city" and "looking inside something" matters.
 */
export type TierScope = 'surabaya' | 'city' | 'district' | 'region' | 'location';

const drilledIn = (scope: TierScope | undefined): boolean =>
  scope === 'district' || scope === 'region' || scope === 'location';

/**
 * The tier set for a camera span AND a drill scope.
 *
 * Camera span is a proxy for density, and drilling in is where the proxy breaks:
 * a rayon that spans the whole city leaves the camera wide, so the span gate hid
 * everything inside it. Drilling in IS the request to see what is inside, so it
 * reveals the subtree at any span. The gate survives at city scope only, where
 * "every tier" means every lokasi in Surabaya.
 *
 * Density is no longer this function's job either — progressive reveal caps the
 * full pins and draws the rest as dots, which beats hiding a tier outright.
 */
export function tiersFor({
  latitudeDelta,
  scope,
}: {
  latitudeDelta: number | undefined;
  scope: TierScope | undefined;
}): TierVisibility {
  if (drilledIn(scope)) return ALL_TIERS;
  return tiersAtDelta(latitudeDelta);
}
```

Then widen the hint helper:

```ts
export function nextTierAtDelta(
  latitudeDelta: number | undefined,
  scope?: TierScope,
): 'region' | 'location' | null {
  const t = tiersFor({ latitudeDelta, scope });
  if (!t.region) return 'region';
  if (!t.location) return 'location';
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/utils/__tests__/zoomTiers.test.ts`
Expected: PASS (existing tests + 7 new)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/utils/zoomTiers.ts apps/mobile/src/utils/__tests__/zoomTiers.test.ts
git commit -m "fix(mobile): drilling in reveals the subtree, whatever the camera spans"
```

---

## Task 6: Combine into progressive reveal

**Files:**
- Create: `apps/mobile/src/utils/progressiveReveal.ts`
- Test: `apps/mobile/src/utils/__tests__/progressiveReveal.test.ts`

**Interfaces:**
- Consumes: `declutter`, `PIN_CELL_X/Y`, `DEFAULT_CELL_X/Y`, `DEFAULT_CAP` (Task 4);
  `scoreNode`, `scoreWorker` (Task 2).
- Produces: `RevealNode extends SalienceNode { id: string; lat: number; lng: number }`,
  `RevealWorker extends SalienceWorker { user_id: string; lat: number; lng: number }`,
  `ProgressiveReveal { promotedNodes: Set<string> | null; promotedWorkers: Set<string> | null;
  labelledNodes: Set<string> | null; labelledWorkers: Set<string> | null }`,
  `computeReveal(input): ProgressiveReveal`, `useProgressiveReveal(input): ProgressiveReveal`,
  `quantiseZoom(zoom)`.

**Two properties this must preserve, both learned on web:**
1. **Pins are presence; labels are detail.** The pin pass runs in viewport mode only; the label pass
   runs in EVERY mode, because two names cannot occupy the same pixels regardless of mode.
2. **Rayon are never demoted** — they are the map's frame, and the exemption is additive to the cap.
   It does NOT carry to labels: a rayon must always be drawn, but its name may yield.

- [ ] **Step 1: Write the failing test**

```ts
import { computeReveal, quantiseZoom } from '../progressiveReveal';

const LAT = -7.2575;
const LNG = 112.7521;
const node = (id: string, i: number, over = {}) => ({
  id, lat: LAT + i * 0.0002, lng: LNG,
  variant: 'region' as const,
  scheduled: 8, clocked_in: 8, belum_hadir: 0, tidak_hadir: 0,
  ...over,
});
const input = (over = {}) => ({
  enabled: true, zoom: 11, nodes: [], workers: [], affinityOf: () => 0, ...over,
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
    const r = computeReveal(input({ enabled: false, nodes: [node('a', 0)] }));
    expect(r.promotedNodes).toBeNull();
    expect(r.promotedWorkers).toBeNull();
  });

  it('still declutters LABELS when the pin pass is off', () => {
    // Two names cannot occupy the same pixels in any mode, and printing them
    // anyway destroys information rather than adding it.
    const crowd = Array.from({ length: 40 }, (_, i) => node(`n${i}`, i));
    const r = computeReveal(input({ enabled: false, nodes: crowd, zoom: 12 }));
    expect(r.labelledNodes).not.toBeNull();
    expect(r.labelledNodes!.size).toBeLessThan(crowd.length);
  });

  it('promotes the troubled area over the calm ones it collides with', () => {
    const nodes = [node('calm', 0), node('outage', 1, { clocked_in: 0, tidak_hadir: 8 })];
    expect(computeReveal(input({ nodes })).promotedNodes).toEqual(new Set(['outage']));
  });

  it('lets affinity decide between equally calm areas', () => {
    const nodes = [node('ignored', 0), node('watched', 1)];
    const r = computeReveal(input({ nodes, affinityOf: (id: string) => (id === 'watched' ? 2.5 : 0) }));
    expect(r.promotedNodes).toEqual(new Set(['watched']));
  });

  it('never demotes a rayon — the frame must not develop holes', () => {
    const rayon = Array.from({ length: 8 }, (_, i) => node(`r${i}`, 0, { variant: 'district' as const }));
    expect(computeReveal(input({ nodes: rayon })).promotedNodes!.size).toBe(8);
  });

  it('spends the cap on the tiers that crowd, not on the frame', () => {
    const rayon = Array.from({ length: 8 }, (_, i) => node(`r${i}`, i * 40, { variant: 'district' as const }));
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

  it('always draws whatever the sheet is describing', () => {
    const nodes = [node('winner', 0, { clocked_in: 0, tidak_hadir: 9 }), node('open', 1)];
    const r = computeReveal(input({ nodes, exemptNodeIds: ['open'] }));
    expect(r.promotedNodes!.has('open')).toBe(true);
  });

  it('tolerates null and undefined exemptions', () => {
    const r = computeReveal(input({ nodes: [node('a', 0)], exemptNodeIds: [null, undefined] }));
    expect(r.promotedNodes).toEqual(new Set(['a']));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/utils/__tests__/progressiveReveal.test.ts`
Expected: FAIL — `Cannot find module '../progressiveReveal'`

- [ ] **Step 3: Write minimal implementation**

Copy `apps/web/src/lib/monitoring/useProgressiveReveal.ts` verbatim, changing only the import paths
(`./declutter`, `./salience`) and the file name. No logic changes: the module is already free of DOM
and browser APIs.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/utils/__tests__/progressiveReveal.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/utils/progressiveReveal.ts apps/mobile/src/utils/__tests__/progressiveReveal.test.ts
git commit -m "feat(mobile): combine salience, affinity and separation into one reveal"
```

---

## Task 7: Render dots, and retire clustering

**Files:**
- Modify: `apps/mobile/src/components/monitoring/UserMarker.tsx`
- Modify: `apps/mobile/src/components/monitoring/AggregateBubbleLayer.tsx`
- Modify: `apps/mobile/src/screens/monitoring/components/MapLayerContent.tsx`
- Modify: `apps/mobile/src/screens/monitoring/hooks/useLiveUsersFiltering.ts`
- Delete: `apps/mobile/src/components/monitoring/ClusteredUserMarkers.tsx`,
  `apps/mobile/src/components/monitoring/ClusterMarker.tsx`, and their tests
- Test: `apps/mobile/src/components/monitoring/__tests__/UserMarker.test.tsx`,
  `apps/mobile/src/screens/monitoring/__tests__/MapDashboardScreen.test.tsx` (extend)

**Interfaces:**
- Consumes: `computeReveal` / `useProgressiveReveal` (Task 6), `tiersFor` (Task 5),
  `deltaToZoom` (Task 1), `useAffinity` (Task 3).
- Produces: `UserMarkerProps` gains `demoted?: boolean`;
  `AggregateBubbleLayerProps` gains `promoted?: Set<string> | null` and `labelled?: Set<string> | null`.

**Do NOT add a `labelled` boolean to `UserMarker`.** It already takes
`labelMode: LabelMode` (`'none' | 'abbrev' | 'full'`), which is the same decision expressed once. The
label pass withholds a name by passing `labelMode="none"` for that worker; a parallel boolean would be
a second switch for one behaviour, and the two would eventually disagree. `clusterCount` is removed
with clustering.

**Why clustering goes** (PARITY.md §5): it was removed from web on the client's request — "it hid people
and confused operators" — and that is not a property of screen size. A merged bubble hides its members
on a phone exactly as it did on a desktop. The dot withholds *detail* and never withholds a *marker*.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react-native';
import { UserMarker } from '../UserMarker';

const worker = {
  id: 'w1', full_name: 'Andi', role: 'satgas', status: 'active' as const,
  is_within_area: true, is_scheduled: true, latitude: -7.25, longitude: 112.75,
};

describe('UserMarker demoted form', () => {
  it('renders a dot instead of a pin when demoted', () => {
    const { getByTestId, queryByTestId } = render(
      <UserMarker user={worker} demoted onPress={jest.fn()} />,
    );
    expect(getByTestId('worker-dot')).toBeTruthy();
    expect(queryByTestId('worker-pin')).toBeNull();
  });

  it('keeps the dot pressable, so nothing is unreachable', () => {
    // The rule this map runs on: presentation may de-emphasise, never hide. A
    // dot that could not be opened would be the clustering behaviour that was
    // removed for hiding people.
    const onPress = jest.fn();
    const { getByTestId } = render(<UserMarker user={worker} demoted onPress={onPress} />);
    fireEvent.press(getByTestId('worker-dot'));
    expect(onPress).toHaveBeenCalled();
  });

  it('colours the dot by status, so a red dot still means trouble', () => {
    const { getByTestId } = render(
      <UserMarker user={{ ...worker, status: 'absent' }} demoted onPress={jest.fn()} />,
    );
    expect(getByTestId('worker-dot').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: expect.any(String) })]),
    );
  });

  it('draws the full pin when not demoted', () => {
    const { getByTestId } = render(<UserMarker user={worker} onPress={jest.fn()} />);
    expect(getByTestId('worker-pin')).toBeTruthy();
  });

  it('withholds the name through the EXISTING labelMode, not a second switch', () => {
    // `labelMode` already decides whether a name is drawn. The label pass feeds
    // it 'none'; adding a parallel boolean would be two switches for one
    // behaviour, and they would eventually disagree.
    const { queryByText } = render(
      <UserMarker user={worker} labelMode="none" onPress={jest.fn()} />,
    );
    expect(queryByText('Andi')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/components/monitoring/__tests__/UserMarker.test.tsx`
Expected: FAIL — no `worker-dot` testID

- [ ] **Step 3: Write minimal implementation**

In `UserMarker.tsx`, add the two props and an early return for the dot form:

```tsx
/**
 * Demoted: this worker lost their space to a more salient neighbour. Still
 * rendered, still at their true position, still pressable — only their detail
 * is deferred. The dot IS the marker at low priority, which is the distinction
 * clustering failed to make.
 */
if (demoted) {
  return (
    <Marker coordinate={coordinate} onPress={onPress} tracksViewChanges={false} anchor={CENTRE}>
      <View testID="worker-dot" style={[styles.dot, { backgroundColor: statusColor }]} />
    </Marker>
  );
}
```

with

```ts
const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: nbColors.white,
  },
});
```

Leave the label logic alone — `MapLayerContent` supplies `labelMode="none"` for a worker the label
pass excluded, which the component already honours.

In `MapLayerContent.tsx`, drop the `ClusteredUserMarkers` import (line 10) and the element (line 252),
and render `UserMarker` directly — the file already renders `UserMarker` in two other branches, so
follow that shape. Then compute the reveal and derive each marker's props from it:

```tsx
const demoted = reveal.promotedWorkers != null && !reveal.promotedWorkers.has(u.id);
const labelMode: LabelMode =
  reveal.labelledWorkers != null && !reveal.labelledWorkers.has(u.id) ? 'none' : baseLabelMode;
```


```tsx
// Camera span → zoom, because collision is measured in pixels. See `mercator`.
const zoom = deltaToZoom(region?.longitudeDelta ?? 360, windowWidth);
const reveal = useProgressiveReveal({
  enabled: mode === 'viewport',
  zoom,
  nodes: revealNodes,
  workers: revealWorkers,
  affinityOf,
  exemptNodeIds: [openNodeId],
  exemptWorkerIds: [selectedUserId],
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/mobile && npx jest src/components/monitoring src/screens/monitoring`
Expected: PASS. The two deleted cluster suites are gone; no other suite references them.

- [ ] **Step 5: Commit**

```bash
git rm apps/mobile/src/components/monitoring/ClusteredUserMarkers.tsx \
       apps/mobile/src/components/monitoring/ClusterMarker.tsx
git add -A
git commit -m "feat(mobile): rank markers instead of clustering them"
```

---

## Task 8: Measure on a device, then tune

**Files:**
- Modify: `apps/mobile/src/utils/declutter.ts` (constants only)
- Modify: `specs/architecture/decisions/ADR-060-monitoring-map-modes.md` (record the mobile numbers)

**This task exists because the constants in Task 4 are guesses.** Web's pair was retuned twice after
being seen rendered; shipping mobile's unmeasured would repeat that.

- [ ] **Step 1: Build and run on the emulator**

```bash
cd apps/mobile && npm run android
```

Metro on :4130. If the bundle fails to load, `npm start -- --reset-cache` and re-check `adb reverse`
(see `specs/deployment/local-development.md`).

- [ ] **Step 2: Record the counts at three camera spans**

In viewport mode, at city span, one-rayon span, and one-kawasan span, note from the React DevTools or a
temporary `console.warn`: eligible nodes, promoted, dots, and whether any two labels visibly overlap.

- [ ] **Step 3: Tune the constants against what you saw**

Target roughly 8–14 full pins on a phone at any span — enough to scan, few enough to read. If labels
overlap, raise `DEFAULT_CELL_X` first (the collision axis is horizontal). If the map looks empty, lower
it before raising the cap.

- [ ] **Step 4: Re-run the suite and confirm nothing regressed**

Run: `cd apps/mobile && npx jest && npx tsc --noEmit && npm run lint`
Expected: all PASS. The declutter tests assert *relationships*, not literal constants, so tuning does
not break them.

- [ ] **Step 5: Record the numbers and commit**

Add a short table to ADR-060 under the existing progressive-reveal amendment: mobile's constants, the
three measurements, and the device they came from.

```bash
git add apps/mobile/src/utils/declutter.ts specs/architecture/decisions/ADR-060-monitoring-map-modes.md
git commit -m "perf(mobile): tune the separation box against a real device"
```

---

## Task 9: Docs, i18n and the PR

**Files:**
- Modify: `specs/features/monitoring/CHANGELOG.md`, `specs/features/monitoring/PARITY.md`
- Modify: `apps/mobile/src/i18n/locales/{id,en}/monitoring.json`

- [ ] **Step 1: Add the reveal hint strings**

Mirror web's keys so the platforms read the same: `monitoring:mode.revealHint` —
id `"Titik kecil = penanda lain. Ketuk, atau perbesar untuk melihat detailnya."`,
en `"Small dots are other markers. Tap one, or zoom in to see its detail."`

- [ ] **Step 2: Verify i18n parity**

Run: `npm run i18n:check` (repo root)
Expected: `✓ i18n parity check passed`

- [ ] **Step 3: Update the specs**

Prepend one line to `specs/features/monitoring/CHANGELOG.md`. In `PARITY.md`, mark M1, M2 and M3 done
and strike the clustering row's open question.

- [ ] **Step 4: Full verification**

Run, in `apps/mobile`: `npx tsc --noEmit && npm run lint && npm test`
Expected: 0 errors, all suites pass, coverage ≥ 80%.

- [ ] **Step 5: Open the PR**

```bash
git push -u origin feat/mobile-monitoring-reveal
gh pr create --base main --title "feat(mobile): rank map markers instead of clustering them"
```

---

## Slices 2–5 — sequencing, not yet planned

Deliberately not written as bite-sized tasks. Each depends on something slice 1 produces or teaches,
and writing them now would bake in guesses this plan explicitly defers.

| Slice | Content | Blocked on |
|---|---|---|
| **2** | Mobile geo search index (M6) + Luar jadwal filter (M5) | Nothing — could run in parallel with slice 1 by a second pair of hands. Both are small; M6 is a **defect** (no lokasi is findable at city scope), so it outranks every remaining feature. |
| **3** | Mobile list sheet: row hide (M4), breadcrumb (M7), Wilayah/Petugas tabs (M8) | Slice 1 — the sheet's node rows must agree with what the map draws, and that contract is set by the reveal. |
| **4** | Web catches up: plant overlay (W1), photo gallery (W2), attendance detail (W3), trail stepper (W4) | Open decision 2 in PARITY.md — is the plant overlay wanted at a desk? The other three are unblocked. |
| **5** | Bulk reassign (M9), on-leave list (M10) on mobile | Slice 3 — both hang off the list sheet. |

Plan each with this same skill when its blocker clears.
