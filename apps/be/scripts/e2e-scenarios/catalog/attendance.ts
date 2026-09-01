/**
 * Attendance scenarios — ADR-055 (punch log), ADR-056 (roster status),
 * ADR-059 (location integrity).
 *
 * Every one of these arranges by writing PUNCHES. The session is then derived by
 * the production derivation service, so what the API returns here is produced by
 * the same path a real clock-in takes.
 */

import type { Scenario } from '../types';
import { firstSession, sessionsFor, punchCount, hasOpenSession } from './assertions';

export const ATTENDANCE: Scenario[] = [
  {
    id: 'ATT-01',
    domain: 'attendance',
    title: 'Clock in on time, still on duty',
    proves: 'ADR-055 — Jam Masuk is the first clock-in; session is open while the last punch is an in',
    subject: { handle: 'att_ontime', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today }) {
      const shift = await helpers.shiftDefId('Shift 1');
      await helpers.schedule({
        userId: subject.userId,
        date: today,
        shiftDefinitionId: shift,
        locationId: subject.locationId,
        districtId: subject.districtId,
      });
      await helpers.punch({
        userId: subject.userId,
        label: 'clock_in',
        at: helpers.wibAt(today, '06:05'),
        serviceDay: today,
        shiftDefinitionId: shift,
        locationId: subject.locationId,
      });
      await helpers.track({
        userId: subject.userId,
        locationId: subject.locationId,
        districtId: subject.districtId,
      });
    },
    expect: [
      {
        what: 'punch log shows one open session with a derived Jam Masuk',
        get: ({ subject, today }) => `/shifts/attendance/${today}/punches`,
        as: 'worker' as const,
        check: (body) => {
          const s = firstSession(body);
          if (!s) return 'no session derived from the punch log';
          if (!s.jam_masuk) return 'jam_masuk did not derive from the clock-in punch';
          if (!s.is_open) return 'session should be open — the last punch is a clock-in';
          return null;
        },
      },
    ],
  },

  {
    id: 'ATT-03',
    domain: 'attendance',
    title: 'Clock out closes the session; hours derive from the pair',
    proves: 'ADR-055 — Jam Keluar is the last clock-out; worked minutes are the paired segments',
    subject: { handle: 'att_closed', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today }) {
      const shift = await helpers.shiftDefId('Shift 1');
      await helpers.schedule({
        userId: subject.userId,
        date: today,
        shiftDefinitionId: shift,
        locationId: subject.locationId,
        districtId: subject.districtId,
      });
      await helpers.punch({
        userId: subject.userId, label: 'clock_in', at: helpers.wibAt(today, '06:00'),
        serviceDay: today, shiftDefinitionId: shift, locationId: subject.locationId,
      });
      await helpers.punch({
        userId: subject.userId, label: 'clock_out', at: helpers.wibAt(today, '14:00'),
        serviceDay: today, shiftDefinitionId: shift, locationId: subject.locationId,
      });
    },
    expect: [
      {
        what: 'session is closed and worked minutes equal the 8-hour pair',
        get: ({ subject, today }) => `/shifts/attendance/${today}/punches`,
        as: 'worker' as const,
        check: (body) => {
          const s = firstSession(body);
          if (!s) return 'no session derived';
          if (s.is_open) return 'session should be closed after a clock-out';
          if (!s.jam_keluar) return 'jam_keluar did not derive';
          if (s.worked_minutes !== 480) return `worked_minutes ${s.worked_minutes}, expected 480`;
          return null;
        },
      },
    ],
  },

  {
    id: 'ATT-05',
    domain: 'attendance',
    title: 'Multi-punch day — a mid-day break costs no hours',
    proves: 'ADR-055 — hours are the SUM of paired segments, not last-minus-first',
    subject: { handle: 'att_multi', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today }) {
      const shift = await helpers.shiftDefId('Shift 1');
      await helpers.schedule({
        userId: subject.userId, date: today, shiftDefinitionId: shift,
        locationId: subject.locationId, districtId: subject.districtId,
      });
      // 06:00–10:00 then 11:00–14:00 = 7 h worked across a 8 h span.
      for (const [label, hhmm] of [
        ['clock_in', '06:00'], ['clock_out', '10:00'],
        ['clock_in', '11:00'], ['clock_out', '14:00'],
      ] as const) {
        await helpers.punch({
          userId: subject.userId, label, at: helpers.wibAt(today, hhmm),
          serviceDay: today, shiftDefinitionId: shift, locationId: subject.locationId,
        });
      }
    },
    expect: [
      {
        what: 'four punches, 420 worked minutes (not the 480-minute span)',
        get: ({ subject, today }) => `/shifts/attendance/${today}/punches`,
        as: 'worker' as const,
        check: (body) => {
          const s = firstSession(body);
          if (!s) return 'no session derived';
          if (punchCount(body) !== 4) return `expected 4 punches, got ${punchCount(body)}`;
          if (s.worked_minutes !== 420)
            return `worked_minutes ${s.worked_minutes}, expected 420 — the break must not be paid`;
          return null;
        },
      },
    ],
  },

  {
    id: 'ATT-11',
    domain: 'attendance',
    title: 'Forgotten clock-out INSIDE grace is still live',
    proves: 'ADR-055 — a session stays live until its window plus cutoff_grace_min passes',
    guards: 'the liveness rule must not close a session early',
    subject: { handle: 'att_dangling_live', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today, now }) {
      // Anchor to a shift whose window is still open right now, so the session is
      // unambiguously live regardless of the hour the suite runs at.
      const shift = await helpers.currentShiftDefId();
      await helpers.schedule({
        userId: subject.userId, date: today, shiftDefinitionId: shift,
        locationId: subject.locationId, districtId: subject.districtId,
      });
      await helpers.punch({
        userId: subject.userId, label: 'clock_in',
        at: new Date(now.getTime() - 30 * 60_000),
        serviceDay: today, shiftDefinitionId: shift, locationId: subject.locationId,
      });
      await helpers.track({
        userId: subject.userId, locationId: subject.locationId,
        districtId: subject.districtId, lastLocationAt: new Date(now.getTime() - 60_000),
      });
    },
    expect: [
      {
        what: 'the open session is returned as the current one',
        get: () => `/shifts/current-state`,
        as: 'worker' as const,
        check: (body) => (hasOpenSession(body) ? null : 'a live session must be reported as open'),
      },
    ],
  },

  {
    id: 'ATT-12',
    domain: 'attendance',
    title: 'Forgotten clock-out PAST grace is open but NOT live',
    proves: 'ADR-055 — never auto-closed, but stops answering "am I on duty?"',
    guards: 'regression: a 5 Aug session answered /shifts/current on 6 Aug',
    subject: { handle: 'att_dangling_dead', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today }) {
      const shift = await helpers.shiftDefId('Shift 1');
      // Three days back: the window plus grace closed long ago, whatever the hour.
      const past = new Date(new Date(`${today}T00:00:00Z`).getTime() - 3 * 86_400_000)
        .toISOString()
        .split('T')[0];
      await helpers.schedule({
        userId: subject.userId, date: past, shiftDefinitionId: shift,
        locationId: subject.locationId, districtId: subject.districtId,
      });
      await helpers.punch({
        userId: subject.userId, label: 'clock_in', at: helpers.wibAt(past, '06:00'),
        serviceDay: past, shiftDefinitionId: shift, locationId: subject.locationId,
      });
    },
    expect: [
      {
        what: 'the stale session is NOT reported as current',
        get: () => `/shifts/current-state`,
        as: 'worker' as const,
        check: (body) =>
          hasOpenSession(body)
            ? 'a session whose window closed days ago must not read as live'
            : null,
      },
      {
        what: 'the row is still there — never auto-closed',
        get: ({ subject, today }) => {
          const past = new Date(new Date(`${today}T00:00:00Z`).getTime() - 3 * 86_400_000)
            .toISOString()
            .split('T')[0];
          return `/shifts/attendance/${past}/punches`;
        },
        as: 'worker' as const,
        check: (body) => {
          const s = sessionsFor(body);
          if (s.length === 0) return 'the dangling session was destroyed — it must be preserved';
          if (!s[0].is_open) return 'the session must remain OPEN for a supervisor to resolve';
          return null;
        },
      },
    ],
  },

  {
    id: 'ATT-21',
    domain: 'attendance',
    title: 'Clock-in outside the boundary succeeds and is flagged',
    proves: 'ADR-005→010 / ADR-059 — out-of-area is advisory and never blocks',
    guards: 'the integrity work must not have made the geofence blocking',
    subject: { handle: 'att_outside', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today }) {
      const shift = await helpers.shiftDefId('Shift 1');
      await helpers.schedule({
        userId: subject.userId, date: today, shiftDefinitionId: shift,
        locationId: subject.locationId, districtId: subject.districtId,
      });
      await helpers.punch({
        userId: subject.userId, label: 'clock_in', at: helpers.wibAt(today, '06:10'),
        serviceDay: today, shiftDefinitionId: shift, locationId: subject.locationId,
        outsideBoundary: true,
      });
    },
    expect: [
      {
        what: 'the punch exists and carries outside_boundary',
        get: ({ subject, today }) => `/shifts/attendance/${today}/punches`,
        as: 'worker' as const,
        check: (body) => {
          const s = firstSession(body);
          if (!s) return 'the out-of-area punch was rejected — it must be recorded';
          const outside = s.punches?.some((p: { outside_boundary?: boolean }) => p.outside_boundary);
          return outside ? null : 'outside_boundary was not preserved on the punch';
        },
      },
    ],
  },
];
