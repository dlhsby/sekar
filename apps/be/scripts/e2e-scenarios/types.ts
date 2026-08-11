/**
 * E2E scenario catalog — types.
 *
 * One scenario is a single object carrying everything about itself: what it
 * proves, how to set it up, and what the API must answer afterwards. Seeding and
 * verification read the SAME object, so a scenario cannot drift from its own
 * assertion — which is what happened to the previous split between
 * `stage-presence-scenarios.ts` and `e2e-presence-scenarios.sh`.
 *
 * Two rules the catalog is built around:
 *
 * 1. `arrange` writes PUNCHES, never `shifts` rows directly. Since ADR-055 the
 *    session is DERIVED from the punch log, so seeding the projection by hand
 *    produces workers whose attendance log is empty and whose Jam Masuk/Keluar
 *    do not derive — which is exactly the state the old seeder left behind.
 *
 * 2. Every expectation is about ITS OWN subject, never a global total. The same
 *    catalog runs against the local demo DB (where you could assert "city shows
 *    7 online") and against the staging clone, where 1 184 real users make any
 *    absolute number meaningless. Per-subject assertions hold in both.
 */

import type { DataSource } from 'typeorm';

export type Domain = 'scheduling' | 'monitoring' | 'attendance';

/** Where the runner is pointed, which decides how subjects are provisioned. */
export type Mode = 'local' | 'clone';

/** The drill tier a worker should be visible at (ADR-046 display scope). */
export type DrillScope = 'city' | 'district' | 'region' | 'location';

/**
 * How a scenario's worker is obtained.
 *
 * `local` mode reuses the demo seed's own users; `clone` mode creates dedicated
 * `e2e_*` accounts, because real staging users have unknown password hashes and
 * mutating them would pollute the dataset the client demo runs from.
 */
export interface SubjectSpec {
  /** Stable handle used in output and to derive the `e2e_*` username in clone mode. */
  handle: string;
  role: 'satgas' | 'linmas' | 'korlap' | 'staff_kecamatan';
  /** Which tier the worker's schedule occurrence is scoped to (drives display_scope). */
  scope: DrillScope;
}

/** Everything an `arrange` step is handed. Keeps scenarios free of wiring. */
export interface ArrangeContext {
  ds: DataSource;
  mode: Mode;
  /** WIB service day the run is anchored to (YYYY-MM-DD). */
  today: string;
  /** Real instant the run started — scenarios offset from this, never from `new Date()`. */
  now: Date;
  /** Resolved subject: the user row plus the geography its schedule points at. */
  subject: ResolvedSubject;
  helpers: Helpers;
}

export interface ResolvedSubject {
  userId: string;
  username: string;
  locationId: string | null;
  regionId: string | null;
  districtId: string | null;
}

/**
 * The write vocabulary available to a scenario. Deliberately small: a scenario
 * describes WHAT happened, not how the tables are shaped.
 */
export interface Helpers {
  /** Append a punch and re-derive the session projection from the whole log. */
  punch(o: {
    userId: string;
    label: 'clock_in' | 'clock_out';
    at: Date;
    serviceDay: string;
    shiftDefinitionId: string | null;
    locationId?: string | null;
    outsideBoundary?: boolean;
    isOvertime?: boolean;
    poorAccuracy?: boolean;
    clockSkewMs?: number;
  }): Promise<void>;
  /** Create (or update) a roster row for a day. */
  schedule(o: {
    userId: string;
    date: string;
    shiftDefinitionId: string | null;
    status?: string;
    locationId?: string | null;
    regionId?: string | null;
    districtId?: string | null;
  }): Promise<void>;
  /** Record a GPS ping, which is what presence recency is derived from. */
  ping(o: {
    userId: string;
    at: Date;
    lat: number;
    lng: number;
    accuracyMeters?: number;
    rejectionReason?: string | null;
  }): Promise<void>;
  /** Point the tracking row at the worker's live session (what clock-in does). */
  track(o: {
    userId: string;
    locationId?: string | null;
    districtId?: string | null;
    withinArea?: boolean;
    lastLocationAt?: Date;
    status?: 'active' | 'offline' | 'absent';
  }): Promise<void>;
  /** Resolve a shift definition by name ("Shift 1"). */
  shiftDefId(name: string): Promise<string>;
  /**
   * The shift whose window contains NOW — what the backend treats as "the
   * current shift". Any scenario asserting display scope or staffing must
   * schedule on THIS, or the scope lookup finds nothing and falls back to city.
   */
  currentShiftDefId(): Promise<string>;
  /** The WIB instant of `HH:MM` on a service day, honouring cross-midnight. */
  wibAt(serviceDay: string, hhmm: string, plusDays?: number): Date;
}

/**
 * One assertion against the live API, phrased about the scenario's own subject.
 *
 * `get` is the path under /api/v1 (the runner supplies auth). `check` receives
 * the parsed body and returns null when satisfied, or a human-readable reason.
 */
export interface Expectation {
  what: string;
  get: (ctx: ExpectContext) => string;
  /**
   * Body to POST instead of issuing a GET.
   *
   * The integrity rules (ADR-059) can only be proven by attempting a WRITE the
   * API must refuse — a rejected punch leaves no row to read afterwards, so
   * there is nothing a GET could assert. `check` then receives the error body
   * and `status` carries the HTTP code.
   */
  post?: (ctx: ExpectContext) => Record<string, unknown>;
  check: (body: unknown, ctx: ExpectContext & { status: number }) => string | null;
  /**
   * Who makes the call. Declared, not inferred from the path — several
   * attendance endpoints are `@Roles(...CLOCKABLE_ROLES)` and read `@GetUser()`,
   * so they are SELF-ONLY: an admin gets 403 and there is no `userId` parameter
   * to widen them with. Defaults to `admin`, which is right for the monitoring
   * and roster reads.
   */
  as?: 'admin' | 'worker';
}

export interface ExpectContext {
  subject: ResolvedSubject;
  today: string;
  /** Absolute totals are only meaningful where the catalog owns the whole DB. */
  mode: Mode;
}

export interface Scenario {
  /** Stable id, e.g. ATT-11. Matches specs/testing/presence-model-matrix.md where one exists. */
  id: string;
  domain: Domain;
  title: string;
  /** The rule this proves — an ADR reference or catalog row. */
  proves: string;
  /**
   * Set when the scenario is a REGRESSION GUARD for a specific defect: it must
   * fail against the code from before that fix. Recorded so a future reader can
   * tell "this covers a rule" from "this stops a bug coming back".
   */
  guards?: string;
  subject: SubjectSpec;
  arrange: (ctx: ArrangeContext) => Promise<void>;
  expect: Expectation[];
  /**
   * Return a reason to SKIP rather than run.
   *
   * For scenarios a deliberate local setting makes untestable — the anti-spoof
   * override being the case in point. A dev who set `ALLOW_MOCKED_LOCATION=true`
   * for emulator work has not caused a regression, and reporting one would train
   * people to ignore a red suite. Skips are counted and printed separately so
   * they cannot masquerade as passes either.
   */
  skipIf?: () => string | null;
}
