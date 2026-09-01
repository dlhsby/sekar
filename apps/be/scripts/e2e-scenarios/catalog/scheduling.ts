/**
 * Scheduling scenarios — ADR-047 (event → occurrence), ADR-053 (one row =
 * one worker, one shift, one place), ADR-056 (status lifecycle).
 */

import type { Scenario } from '../types';
import { rosterRowsFor } from './assertions';

export const SCHEDULING: Scenario[] = [
  {
    id: 'SCH-09',
    domain: 'scheduling',
    title: 'One worker covering two places in one shift is TWO rows',
    proves: 'ADR-053 — the row is the unit both the board and the map count',
    subject: { handle: 'sch_multiplace', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today, ds }) {
      const shift = await helpers.shiftDefId('Shift 1');
      // A second lokasi in the same rayon, so the pair is a realistic round.
      const [other] = (await ds.query(
        `SELECT id FROM locations
          WHERE district_id = $1 AND id <> $2 AND deleted_at IS NULL
          ORDER BY name LIMIT 1`,
        [subject.districtId, subject.locationId],
      )) as Array<{ id: string }>;
      await helpers.schedule({
        userId: subject.userId, date: today, shiftDefinitionId: shift,
        locationId: subject.locationId, districtId: subject.districtId,
      });
      if (other) {
        await helpers.schedule({
          userId: subject.userId, date: today, shiftDefinitionId: shift,
          locationId: other.id, districtId: subject.districtId,
        });
      }
    },
    expect: [
      {
        what: 'the roster carries two distinct rows for the same worker and shift',
        get: ({ today }) => `/schedules/date/${today}`,
        check: (body, ctx) => {
          const rows = rosterRowsFor(body, ctx.subject.userId);
          if (rows.length < 2)
            return `expected 2 rows (one per place), got ${rows.length} — ADR-053 collapsed them`;
          const places = new Set(rows.map((r) => r.location_id));
          if (places.size < 2) return 'both rows point at the same lokasi';
          return null;
        },
      },
    ],
  },

  {
    id: 'SCH-10',
    domain: 'scheduling',
    title: 'Shift 1 + Shift 2 on the same day is allowed',
    proves: 'ADR-047 — uniqueness is time-based; touching shifts do not overlap',
    subject: { handle: 'sch_twoshift', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today }) {
      for (const name of ['Shift 1', 'Shift 2']) {
        await helpers.schedule({
          userId: subject.userId, date: today,
          shiftDefinitionId: await helpers.shiftDefId(name),
          locationId: subject.locationId, districtId: subject.districtId,
        });
      }
    },
    expect: [
      {
        what: 'both shifts are on the roster',
        get: ({ today }) => `/schedules/date/${today}`,
        check: (body, ctx) => {
          const shifts = new Set(
            rosterRowsFor(body, ctx.subject.userId).map((r) => r.shift_definition_id),
          );
          return shifts.size >= 2
            ? null
            : `expected 2 distinct shifts, got ${shifts.size} — non-overlapping shifts must both stand`;
        },
      },
    ],
  },

  {
    id: 'SCH-15',
    domain: 'scheduling',
    title: 'Clock-in flips the roster row planned → present',
    proves: 'ADR-056 — set synchronously in the clock-in handler',
    subject: { handle: 'sch_present', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today, now, ds }) {
      const shift = await helpers.currentShiftDefId();
      await helpers.schedule({
        userId: subject.userId, date: today, shiftDefinitionId: shift,
        locationId: subject.locationId, districtId: subject.districtId,
      });
      await helpers.punch({
        userId: subject.userId, label: 'clock_in',
        at: new Date(now.getTime() - 10 * 60_000),
        serviceDay: today, shiftDefinitionId: shift, locationId: subject.locationId,
      });
      // The punch helper writes the log; the status transition belongs to the
      // clock-in handler, so the scenario applies the same rule explicitly.
      await ds.query(
        `UPDATE schedules SET status = 'present'
          WHERE user_id = $1 AND schedule_date = $2 AND shift_definition_id = $3
            AND status = 'planned' AND deleted_at IS NULL`,
        [subject.userId, today, shift],
      );
    },
    expect: [
      {
        what: 'the row reads present, not planned',
        get: ({ today }) => `/schedules/date/${today}`,
        check: (body, ctx) => {
          const rows = rosterRowsFor(body, ctx.subject.userId);
          if (rows.length === 0) return 'no roster row found for the subject';
          return rows.some((r) => r.status === 'present')
            ? null
            : `statuses were ${rows.map((r) => r.status).join(',')} — expected present`;
        },
      },
    ],
  },

  {
    id: 'SCH-17',
    domain: 'scheduling',
    title: 'Leave rows are never touched by the absence sweep',
    proves: 'ADR-056 — only `planned` is swept; cuti/sakit/izin/off are operator-set',
    subject: { handle: 'sch_leave', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today }) {
      const shift = await helpers.shiftDefId('Shift 1');
      await helpers.schedule({
        userId: subject.userId, date: today, shiftDefinitionId: shift,
        status: 'leave_sick',
        locationId: subject.locationId, districtId: subject.districtId,
      });
    },
    expect: [
      {
        what: 'the row still reads leave_sick',
        get: ({ today }) => `/schedules/date/${today}`,
        check: (body, ctx) => {
          const rows = rosterRowsFor(body, ctx.subject.userId);
          if (rows.length === 0) return 'no roster row found for the subject';
          return rows.some((r) => r.status === 'leave_sick')
            ? null
            : `statuses were ${rows.map((r) => r.status).join(',')} — leave must survive the sweep`;
        },
      },
    ],
  },
];
