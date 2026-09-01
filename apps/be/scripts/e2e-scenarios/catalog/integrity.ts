/**
 * Location-integrity scenarios — ADR-059.
 *
 * These are the only scenarios that assert a WRITE, because that is the only way
 * to prove a refusal: a rejected punch leaves no row, so there is nothing a GET
 * could look at afterwards. Each POSTs a clock-in the API must refuse (or, for
 * the advisory cases, must ACCEPT) and checks the error code.
 *
 * The pairing matters as much as the individual cases: `refused` and `accepted`
 * sit side by side, so a change that started blocking honest workers — the risk
 * ADR-059 is most concerned with — fails here rather than in the field.
 */

import type { Scenario } from '../types';

/** Read `code` off the API's error envelope. */
function errorCode(body: unknown): string | null {
  const b = body as { code?: string; error?: string; data?: { code?: string } };
  return b?.code ?? b?.data?.code ?? null;
}

/** A valid clock-in body the scenario then perturbs. */
function punchBody(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { gps_lat: -7.2905, gps_lng: 112.7398, accuracy_m: 8, is_mocked: false, ...over };
}

/** Give each integrity subject a roster row so only the fix under test differs. */
async function scheduleToday(ctx: Parameters<Scenario['arrange']>[0]): Promise<void> {
  const { helpers, subject, today } = ctx;
  await helpers.schedule({
    userId: subject.userId,
    date: today,
    shiftDefinitionId: await helpers.currentShiftDefId(),
    locationId: subject.locationId,
    districtId: subject.districtId,
  });
}

export const INTEGRITY: Scenario[] = [
  {
    id: 'ATT-17',
    domain: 'attendance',
    title: 'Null island is refused',
    proves: 'ADR-059 — (0,0) is the shape a MISSING fix takes, since the DTO requires both fields',
    guards: 'regression: the punch gate was unreachable because is_mocked was never sent',
    subject: { handle: 'int_nullisland', role: 'satgas', scope: 'location' },
    arrange: scheduleToday,
    expect: [
      {
        what: 'clock-in at (0,0) is refused with GPS_MISSING_COORDINATES',
        get: () => '/shifts/clock-in',
        as: 'worker',
        post: () => punchBody({ gps_lat: 0, gps_lng: 0 }),
        check: (body, { status }) => {
          if (status < 400) return 'a punch with no location was ACCEPTED';
          const code = errorCode(body);
          return code === 'GPS_MISSING_COORDINATES'
            ? null
            : `expected GPS_MISSING_COORDINATES, got ${code ?? `HTTP ${status}`}`;
        },
      },
    ],
  },

  {
    id: 'ATT-18',
    domain: 'attendance',
    title: 'A mock-provided fix is refused',
    proves: 'ADR-059 — the OS mock flag is sufficient evidence to refuse',
    guards: 'regression: is_mocked was never sent on a punch, so this gate was dead',
    subject: { handle: 'int_mocked', role: 'satgas', scope: 'location' },
    // The dev override exists so an emulator (whose every fix is mock-provided)
    // stays usable. With it on, the server is SUPPOSED to accept this — a
    // failure would be reporting the developer's own deliberate setting as a
    // regression, which is how people learn to ignore a red suite.
    skipIf: () =>
      process.env.ALLOW_MOCKED_LOCATION === 'true'
        ? 'ALLOW_MOCKED_LOCATION=true — the server is deliberately accepting mocked fixes'
        : null,
    arrange: scheduleToday,
    expect: [
      {
        what: 'clock-in with is_mocked=true is refused with GPS_MOCKED',
        get: () => '/shifts/clock-in',
        as: 'worker',
        post: () => punchBody({ is_mocked: true }),
        check: (body, { status }) => {
          if (status < 400) {
            return (
              'a mocked fix was ACCEPTED — if ALLOW_MOCKED_LOCATION is set for emulator ' +
              'work, unset it before running the integrity scenarios'
            );
          }
          const code = errorCode(body);
          return code === 'GPS_MOCKED' ? null : `expected GPS_MOCKED, got ${code ?? `HTTP ${status}`}`;
        },
      },
    ],
  },

  {
    id: 'ATT-20',
    domain: 'attendance',
    title: 'Poor accuracy is ACCEPTED and flagged, never refused',
    proves: 'ADR-059 — the tree-canopy case; refusing it would punish the honest worker',
    guards: 'the integrity work must not have made bad GPS blocking',
    subject: { handle: 'int_pooracc', role: 'satgas', scope: 'location' },
    arrange: scheduleToday,
    expect: [
      {
        what: 'a 500 m-accuracy clock-in still succeeds',
        get: () => '/shifts/clock-in',
        as: 'worker',
        post: () => punchBody({ accuracy_m: 500 }),
        check: (body, { status }) =>
          status < 400
            ? null
            : `poor accuracy was REFUSED (${errorCode(body) ?? status}) — it must only be flagged`,
      },
    ],
  },

  {
    id: 'ATT-21b',
    domain: 'attendance',
    title: 'A punch far outside every boundary is ACCEPTED',
    proves: 'ADR-005→010 — being outside an area never blocks, only flags',
    guards: 'the single most important property not to regress',
    subject: { handle: 'int_faroutside', role: 'satgas', scope: 'location' },
    arrange: scheduleToday,
    expect: [
      {
        what: 'a clock-in ~90 km away still succeeds',
        get: () => '/shifts/clock-in',
        as: 'worker',
        // Still plausible ground truth, just nowhere near the assigned lokasi.
        post: () => punchBody({ gps_lat: -8.0905, gps_lng: 112.7398 }),
        check: (body, { status }) =>
          status < 400
            ? null
            : `an out-of-area punch was REFUSED (${errorCode(body) ?? status}) — ADR-005→010 says it must not be`,
      },
    ],
  },
];
