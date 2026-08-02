import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { ScheduleStatus } from '../entities/schedule.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { isShiftWindowClosed } from '../schedules.service';
import { ADMIN, setupSchedulesTestbed } from './schedules.testbed';

/**
 * Roster writes — see `schedules.writes.ts`.
 *
 * Creating a row, and every edit to one: leave, replacement, re-placing,
 * re-shifting, per-day override, and the role hierarchy that gates them.
 *
 * Split out of the 2,163-line `schedules.service.spec.ts`; all four files share
 * one testbed so the mocks cannot drift between them.
 */
const t = setupSchedulesTestbed();

describe('SchedulesService — roster writes', () => {
  describe('generateRoster', () => {
    it('materializes all active schedule events for the given date via ScheduleMaterializerService', async () => {
      const event1 = { id: 'event1' };
      const event2 = { id: 'event2' };
      t.eventRepo.find.mockResolvedValue([event1, event2]);
      t.materializer.materializeEvent
        .mockResolvedValueOnce({ created: 5, skipped: [] })
        .mockResolvedValueOnce({ created: 3, skipped: [] });

      const created = await t.service.generateRoster('2026-06-30', 'admin');

      expect(created).toBe(8); // 5 + 3
      // Events are now date-scoped: a where array of active + date-overlap branches.
      expect(t.eventRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([expect.objectContaining({ is_active: true })]),
        }),
      );
      expect(t.materializer.materializeEvent).toHaveBeenCalledTimes(2);
      expect(t.materializer.materializeEvent).toHaveBeenCalledWith(
        event1,
        '2026-06-30',
        '2026-06-30',
      );
      expect(t.materializer.materializeEvent).toHaveBeenCalledWith(
        event2,
        '2026-06-30',
        '2026-06-30',
      );
    });

    it('logs failures per event but continues materializing remaining events', async () => {
      const event1 = { id: 'event1' };
      const event2 = { id: 'event2' };
      t.eventRepo.find.mockResolvedValue([event1, event2]);
      t.materializer.materializeEvent
        .mockRejectedValueOnce(new Error('event1 failed'))
        .mockResolvedValueOnce({ created: 3, skipped: [] });

      const created = await t.service.generateRoster('2026-06-30', 'admin');

      expect(created).toBe(3); // only event2 succeeded
      expect(t.materializer.materializeEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('setLeave', () => {
    it('marks the row leave_sick, stores notes, flips source to manual, audits', async () => {
      t.rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          location_id: null,
        })
        .mockResolvedValueOnce({ id: 'd1', status: ScheduleStatus.LEAVE_SICK });

      await t.service.setLeave('d1', 'sick', 'demam', ADMIN);

      const saved = t.rosterRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(ScheduleStatus.LEAVE_SICK);
      expect(saved.notes).toBe('demam');
      expect(saved.source).toBe('manual');
      expect(t.audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ entity_type: 'schedule', action: 'set_leave' }),
      );
    });

    it.each([
      ['sick', ScheduleStatus.LEAVE_SICK],
      ['annual', ScheduleStatus.LEAVE_ANNUAL],
      ['permit', ScheduleStatus.LEAVE_PERMIT],
      ['off', ScheduleStatus.OFF],
    ] as const)('maps absence type %s → %s', async (type, expected) => {
      t.rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          location_id: null,
        })
        .mockResolvedValueOnce({ id: 'd1', status: expected });

      await t.service.setLeave('d1', type, undefined, ADMIN);

      expect(t.rosterRepo.save.mock.calls[0][0].status).toBe(expected);
    });
  });

  describe('replaceWorker', () => {
    it('marks the original replaced and upserts a covering row for the same day (now uses findAllByUserAndDate)', async () => {
      const original = {
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_date: '2026-06-30',
        district_id: 'r1',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        location_id: 'area1',
      };
      t.rosterRepo.findOne
        .mockResolvedValueOnce(original) // findOne(id)
        .mockResolvedValueOnce({ ...original, status: ScheduleStatus.REPLACED }); // final refresh
      // findAllByUserAndDate(replacement_id, date) → no existing rows
      t.rosterRepo.find.mockResolvedValueOnce([]);
      t.userRepo.findOne.mockResolvedValue({ id: 'B', role: UserRole.SATGAS });

      await t.service.replaceWorker('d1', 'B', undefined, ADMIN);

      const originalSave = t.rosterRepo.save.mock.calls[0][0];
      expect(originalSave.status).toBe(ScheduleStatus.REPLACED);
      expect(originalSave.replacement_user_id).toBe('B');
      // No existing cover row → created fresh via create()+save() (safe: no
      // stale eager relations on a brand-new entity).
      const coverSave = t.rosterRepo.save.mock.calls[1][0];
      expect(coverSave.user_id).toBe('B');
      expect(coverSave.original_user_id).toBe('A');
      expect(coverSave.shift_definition_id).toBe('s1');
    });

    it('upserts an EXISTING covering row via update(), not save() (avoids the stale-eager-relation revert bug)', async () => {
      const original = {
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_date: '2026-06-30',
        district_id: 'r1',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        location_id: 'area1',
      };
      const existingCoverRow = {
        id: 'cover1',
        user_id: 'B',
        shift_definition_id: 's1', // Matching shift for reuse
        status: ScheduleStatus.OFF,
        // Stale eager relation from findAllByUserAndDate() — must be ignored.
        shift_definition: { id: 'old-shift' },
      };
      t.rosterRepo.findOne
        .mockResolvedValueOnce(original) // findOne(id)
        .mockResolvedValueOnce({ ...original, status: ScheduleStatus.REPLACED }); // final refresh
      // findAllByUserAndDate(replacement_id, date) returns one existing row
      t.rosterRepo.find.mockResolvedValueOnce([existingCoverRow]);
      t.userRepo.findOne.mockResolvedValue({ id: 'B', role: UserRole.SATGAS });

      await t.service.replaceWorker('d1', 'B', undefined, ADMIN);

      expect(t.rosterRepo.update).toHaveBeenCalledWith(
        'cover1',
        expect.objectContaining({ shift_definition_id: 's1', original_user_id: 'A' }),
      );
      // The stale cover row was never passed to save() for the cover upsert.
      expect(t.rosterRepo.save.mock.calls.some((c) => c[0]?.id === 'cover1')).toBe(false);
    });

    it('rejects replacing a worker with themselves', async () => {
      t.rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        location_id: null,
      });
      await expect(t.service.replaceWorker('d1', 'A', undefined, ADMIN)).rejects.toThrow();
    });

    it('rejects a replacement who is already committed (planned/leave) that day', async () => {
      t.rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_date: '2026-06-30',
        district_id: 'r1',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        location_id: null,
      });
      // findAllByUserAndDate(replacement_id, date) returns rows with BUSY status
      t.rosterRepo.find.mockResolvedValueOnce([
        {
          id: 'd2',
          user_id: 'B',
          status: ScheduleStatus.PLANNED, // BUSY → can't cover
        },
      ]);
      t.userRepo.findOne.mockResolvedValue({ id: 'B', role: UserRole.SATGAS });

      await expect(t.service.replaceWorker('d1', 'B', undefined, ADMIN)).rejects.toThrow(
        'already has a schedule',
      );
    });
  });

  describe('addForDay', () => {
    it('adds one row with a shift, using t.overlapService.findConflict to check for conflicts', async () => {
      t.userRepo.findOne.mockResolvedValue({
        id: 'W',
        is_active: true,
        role: UserRole.SATGAS,
        district_id: 'r1',
        shift_definition_id: 's1',
      });
      t.shiftDefinitionRepo.findOne.mockResolvedValue({
        id: 's1',
        name: 'Shift 1',
        start_time: '06:00:00',
        end_time: '15:00:00',
      });
      t.overlapService.findConflict.mockResolvedValue(null); // No conflict
      t.rosterRepo.save.mockResolvedValue({ id: 'new', user_id: 'W' });
      t.rosterRepo.findOne.mockResolvedValue({ id: 'new', user_id: 'W', location_id: null }); // findOne refresh
      t.userAreas.getPermanentLocationIds.mockResolvedValue(['areaP']);

      await t.service.addForDay(
        { user_id: 'W', date: '2026-07-04', shift_definition_id: 's1' },
        ADMIN,
      );

      const saved = t.rosterRepo.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        user_id: 'W',
        schedule_date: '2026-07-04',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        source: 'manual',
      });
      // Verify t.overlapService was called
      expect(t.overlapService.findConflict).toHaveBeenCalledWith(
        'W',
        '2026-07-04',
        expect.objectContaining({ id: 's1' }),
      );
    });

    it('adds one row without a shift (OFF status), rejecting if the worker already has any row', async () => {
      t.userRepo.findOne.mockResolvedValue({
        id: 'W',
        is_active: true,
        role: UserRole.SATGAS,
        district_id: 'r1',
      });
      // Shiftless add: check findAllByUserAndDate, which returns empty
      t.rosterRepo.find.mockResolvedValue([]);
      t.rosterRepo.save.mockResolvedValue({ id: 'new', user_id: 'W' });
      t.rosterRepo.findOne.mockResolvedValue({ id: 'new', user_id: 'W', location_id: null }); // findOne refresh
      t.userAreas.getPermanentLocationIds.mockResolvedValue(['areaP']);

      await t.service.addForDay({ user_id: 'W', date: '2026-07-04' }, ADMIN);

      const saved = t.rosterRepo.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        user_id: 'W',
        schedule_date: '2026-07-04',
        shift_definition_id: null,
        status: ScheduleStatus.OFF,
        source: 'manual',
      });
    });

    it('rejects shiftless add when the worker already has any schedule that day', async () => {
      t.userRepo.findOne.mockResolvedValue({ id: 'W', is_active: true, role: UserRole.SATGAS });
      // findAllByUserAndDate returns one existing row
      t.rosterRepo.find.mockResolvedValue([
        { id: 'existing', user_id: 'W', schedule_date: '2026-07-04', status: ScheduleStatus.OFF },
      ]);

      await expect(
        t.service.addForDay({ user_id: 'W', date: '2026-07-04' }, ADMIN),
      ).rejects.toThrow('already has a schedule');
      expect(t.rosterRepo.save).not.toHaveBeenCalled();
    });

    it('allows non-overlapping second shift to be added (ADR-047)', async () => {
      t.userRepo.findOne.mockResolvedValue({
        id: 'W',
        is_active: true,
        role: UserRole.SATGAS,
        district_id: 'r1',
      });
      t.shiftDefinitionRepo.findOne.mockResolvedValue({
        id: 's2',
        name: 'Shift 2',
        start_time: '15:00:00',
        end_time: '23:00:00',
      });
      // First shift exists (06:00-15:00), candidate is 15:00-23:00 (touching, not overlapping)
      t.overlapService.findConflict.mockResolvedValue(null);
      t.rosterRepo.save.mockResolvedValue({ id: 'new2', user_id: 'W' });
      t.rosterRepo.findOne.mockResolvedValue({ id: 'new2', user_id: 'W', location_id: null }); // findOne refresh
      t.userAreas.getPermanentLocationIds.mockResolvedValue(['areaP']);

      await t.service.addForDay(
        { user_id: 'W', date: '2026-07-04', shift_definition_id: 's2' },
        ADMIN,
      );

      expect(t.rosterRepo.save).toHaveBeenCalled();
      expect(t.overlapService.findConflict).toHaveBeenCalledWith(
        'W',
        '2026-07-04',
        expect.objectContaining({ id: 's2' }),
      );
    });

    it('allows overlapping shift (Phase 4: warn, not reject)', async () => {
      // Phase 4 (ADR-047 amended): overlaps are warned, not rejected (Google-Calendar style)
      t.userRepo.findOne.mockResolvedValue({
        id: 'W',
        is_active: true,
        role: UserRole.SATGAS,
        district_id: 'r1',
      });
      t.shiftDefinitionRepo.findOne.mockResolvedValue({
        id: 's3',
        name: 'Shift 3',
        start_time: '14:00:00',
        end_time: '22:00:00',
      });
      // Overlap detected but allowed (logs warning)
      t.overlapService.findConflict.mockResolvedValue({
        schedule_id: 'existing-s2',
        date: '2026-07-04',
        shift_name: 'Shift 2',
      });
      t.rosterRepo.save.mockResolvedValue({ id: 'new-overlap', user_id: 'W' });
      t.rosterRepo.findOne.mockResolvedValue({
        id: 'new-overlap',
        user_id: 'W',
        location_id: null,
      });
      t.userAreas.getPermanentLocationIds.mockResolvedValue(['areaP']);

      // Should not throw — creates the row anyway
      const result = await t.service.addForDay(
        { user_id: 'W', date: '2026-07-04', shift_definition_id: 's3' },
        ADMIN,
      );
      expect(result.id).toBe('new-overlap');
      expect(t.rosterRepo.save).toHaveBeenCalled();
    });

    // The uniqueness key is (user, date, shift, PLACE) — migration 17517. One
    // worker covering two lokasi during the SAME shift is the intended case
    // (ADR-053), so only a repeat of the same shift AT THE SAME PLACE is a
    // duplicate. Matching on the shift alone rejected the legitimate one.
    describe('duplicate detection is keyed on (shift, place)', () => {
      const worker = { id: 'W', is_active: true, role: UserRole.SATGAS, district_id: 'r1' };
      const shift3 = { id: 's3', name: 'Shift 3', start_time: '14:00:00', end_time: '22:00:00' };

      beforeEach(() => {
        t.userRepo.findOne.mockResolvedValue(worker);
        t.shiftDefinitionRepo.findOne.mockResolvedValue(shift3);
        t.overlapService.findConflict.mockResolvedValue(null);
        t.rosterRepo.save.mockResolvedValue({ id: 'new', user_id: 'W' });
        t.rosterRepo.findOne.mockResolvedValue({ id: 'new', user_id: 'W', location_id: null });
      });

      it('rejects the same shift at the SAME place', async () => {
        t.rosterRepo.find.mockResolvedValue([
          {
            user_id: 'W',
            schedule_date: '2026-07-04',
            shift_definition_id: 's3',
            location_id: 'locA',
          },
        ]);

        await expect(
          t.service.addForDay(
            { user_id: 'W', date: '2026-07-04', shift_definition_id: 's3', area_ids: ['locA'] },
            ADMIN,
          ),
        ).rejects.toThrow(/already has this shift at this place/i);
        expect(t.rosterRepo.save).not.toHaveBeenCalled();
      });

      it('ALLOWS the same shift at a different lokasi — the point of ADR-053', async () => {
        t.rosterRepo.find.mockResolvedValue([
          {
            user_id: 'W',
            schedule_date: '2026-07-04',
            shift_definition_id: 's3',
            location_id: 'locA',
          },
        ]);

        await t.service.addForDay(
          { user_id: 'W', date: '2026-07-04', shift_definition_id: 's3', area_ids: ['locB'] },
          ADMIN,
        );

        expect(t.rosterRepo.save).toHaveBeenCalled();
      });

      it('writes nothing when several lokasi are named', async () => {
        t.rosterRepo.find.mockResolvedValue([]);

        await expect(
          t.service.addForDay(
            {
              user_id: 'W',
              date: '2026-07-04',
              shift_definition_id: 's3',
              area_ids: ['locA', 'locB'],
            },
            ADMIN,
          ),
        ).rejects.toThrow(/exactly one place/i);
        // Validated BEFORE the insert: this used to answer 400 and leave the row.
        expect(t.rosterRepo.save).not.toHaveBeenCalled();
      });
    });

    it('rejects a non-schedulable role (staff_kecamatan)', async () => {
      t.userRepo.findOne.mockResolvedValue({
        id: 'K',
        is_active: true,
        role: UserRole.STAFF_KECAMATAN,
      });

      await expect(
        t.service.addForDay({ user_id: 'K', date: '2026-07-04' }, ADMIN),
      ).rejects.toThrow('not schedulable');
    });
  });

  describe('updateShift', () => {
    it('clearing the shift flips a PLANNED row to OFF, via update() not save()', async () => {
      // `shift_definition` is an `eager: true` relation, so `row` below carries
      // a stale relation object — save(row) would let TypeORM reconcile the FK
      // from it and revert the clear. Must use a raw column update() instead.
      t.rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          shift_definition_id: 's1',
          shift_definition: { id: 's1', name: 'Shift 1' },
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
        })
        .mockResolvedValueOnce({ id: 'd1', status: ScheduleStatus.OFF });

      await t.service.updateShift('d1', null, ADMIN);

      expect(t.rosterRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ shift_definition_id: null, status: ScheduleStatus.OFF }),
      );
      expect(t.rosterRepo.save).not.toHaveBeenCalled();
    });

    it('sets a new shift and flips an OFF row to PLANNED', async () => {
      t.rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.OFF,
          shift_definition_id: null,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
        })
        .mockResolvedValueOnce({ id: 'd1', status: ScheduleStatus.PLANNED });

      await t.service.updateShift('d1', 's2', ADMIN);

      expect(t.rosterRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ shift_definition_id: 's2', status: ScheduleStatus.PLANNED }),
      );
    });

    it('leaves a LEAVE_SICK row status untouched when the shift changes', async () => {
      t.rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.LEAVE_SICK,
          shift_definition_id: 's1',
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
        })
        .mockResolvedValueOnce({ id: 'd1', status: ScheduleStatus.LEAVE_SICK });

      await t.service.updateShift('d1', null, ADMIN);

      expect(t.rosterRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ status: ScheduleStatus.LEAVE_SICK }),
      );
    });
  });

  describe('updateAreas', () => {
    it('replaces the areas via setAreas() and updates via update(), not save()', async () => {
      // `row` holds relation objects from findOne(); entity save would reconcile
      // FK columns back from those stale objects and revert the write. Must use
      // update().
      t.rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          location_id: 'area1',
        })
        .mockResolvedValueOnce({ id: 'd1', location_id: null });

      await t.service.updateAreas('d1', [], ADMIN);

      expect(t.rosterRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ source: 'manual' }),
      );
      expect(t.rosterRepo.save).not.toHaveBeenCalled();
    });

    it('inserts the new area rows when areas are added', async () => {
      t.rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          location_id: null,
        })
        .mockResolvedValueOnce({ id: 'd1', location_id: 'area2' });

      await t.service.updateAreas('d1', ['area2'], ADMIN);

      // The place lives on the row now (ADR-053), so setting it is a column write —
      // one UPDATE carrying the place and the provenance together.
      expect(t.rosterRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ location_id: 'area2', source: 'manual' }),
      );
    });

    it('rejects more than one lokasi instead of silently keeping the first (ADR-053)', async () => {
      t.rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        status: ScheduleStatus.PLANNED,
        schedule_date: '2026-06-30',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        location_id: null,
      });

      // One row = one place. Truncating to `[0]` behind a 200 lost the operator's
      // other picks silently and wrote an t.audit entry the row never matched.
      await expect(t.service.updateAreas('d1', ['area2', 'area3'], ADMIN)).rejects.toThrow(
        BadRequestException,
      );
      expect(t.rosterRepo.update).not.toHaveBeenCalled();
    });

    it('rejects a row scoped to a lokasi AND a kawasan at once (ADR-053)', async () => {
      t.rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        status: ScheduleStatus.PLANNED,
        schedule_date: '2026-06-30',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        location_id: null,
      });

      // `schedulePlaceKey` resolves lokasi first, so the kawasan would survive as
      // unreachable state that still matched the board's region filter — the row
      // would show up under both containers.
      await expect(
        t.service.updateAreas('d1', ['area2'], ADMIN, undefined, 'region9'),
      ).rejects.toThrow(BadRequestException);
      expect(t.rosterRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('overrideForDay', () => {
    it('creates a PLANNED row with the shift when one is provided', async () => {
      // findAllByUserAndDate returns empty array (no existing row)
      t.rosterRepo.find.mockResolvedValue([]);
      t.rosterRepo.save.mockResolvedValue({ id: 'gen-1', location_id: null });

      await t.service.overrideForDay(
        'u1',
        '2026-07-01',
        { locationId: 'a1', districtId: 'r1', shiftDefinitionId: 's1' },
        'admin',
      );

      const created = t.rosterRepo.save.mock.calls[0][0];
      expect(created.status).toBe(ScheduleStatus.PLANNED);
      expect(created.shift_definition_id).toBe('s1');
      expect(created.district_id).toBe('r1');
    });

    it('creates an OFF row (not PLANNED) when no shift is provided', async () => {
      t.rosterRepo.find.mockResolvedValue([]);
      t.rosterRepo.save.mockResolvedValue({ id: 'gen-1', location_id: null });

      await t.service.overrideForDay('u1', '2026-07-01', { locationId: 'a1' }, 'admin');

      const created = t.rosterRepo.save.mock.calls[0][0];
      expect(created.status).toBe(ScheduleStatus.OFF);
      expect(created.shift_definition_id).toBeNull();
    });

    it('sets the day to exactly the target area', async () => {
      t.rosterRepo.find.mockResolvedValue([]);
      t.rosterRepo.save.mockResolvedValue({ id: 'gen-1', location_id: null });

      await t.service.overrideForDay(
        'u1',
        '2026-07-01',
        { locationId: 'a9', shiftDefinitionId: 's1' },
        'admin',
      );

      const written = t.rosterRepo.update.mock.calls
        .map((c) => c[1]?.location_id)
        .filter((v) => v !== undefined);
      expect(written).toEqual(['a9']);
    });

    it('updates an EXISTING row via update(), not save() (same stale-eager-relation pitfall)', async () => {
      const existingRow = {
        id: 'existing-1',
        status: ScheduleStatus.OFF,
        shift_definition_id: null,
        shift_definition: null,
        location_id: null,
      };
      // findAllByUserAndDate returns the existing row
      t.rosterRepo.find.mockResolvedValue([existingRow]);

      await t.service.overrideForDay(
        'u1',
        '2026-07-01',
        { locationId: 'a1', districtId: 'r1', shiftDefinitionId: 's1' },
        'admin',
      );

      expect(t.rosterRepo.update).toHaveBeenCalledWith(
        'existing-1',
        expect.objectContaining({ shift_definition_id: 's1', status: ScheduleStatus.PLANNED }),
      );
      // The existing row should NOT be passed to save()
      expect(t.rosterRepo.save.mock.calls.some((c) => c[0]?.id === 'existing-1')).toBe(false);
    });
  });

  describe('edit hierarchy (assertCanEdit via setLeave)', () => {
    const KORLAP = { id: 'k1', role: UserRole.KORLAP } as User;
    const KEPALA = { id: 'kr1', role: UserRole.KEPALA_RAYON, district_id: 'r1' } as User;
    const TOP = { id: 't1', role: UserRole.MANAGEMENT } as User;

    /** Queue findOne(id) then the post-save refresh so an ALLOWED edit resolves. */
    function allowRow(row: Record<string, unknown>): void {
      t.rosterRepo.findOne
        .mockResolvedValueOnce(row)
        .mockResolvedValueOnce({ id: row.id, status: ScheduleStatus.LEAVE_SICK });
    }

    it('korlap can edit a satgas in their assigned area', async () => {
      t.userAreas.getPermanentLocationIds.mockResolvedValue(['area1']);
      allowRow({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        location_id: 'area1',
      });
      await expect(t.service.setLeave('d1', 'sick', undefined, KORLAP)).resolves.toBeDefined();
    });

    it('korlap CANNOT edit a satgas outside their areas', async () => {
      t.userAreas.getPermanentLocationIds.mockResolvedValue(['areaX']);
      t.rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        location_id: 'area1',
      });
      await expect(t.service.setLeave('d1', 'sick', undefined, KORLAP)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('korlap CANNOT edit another korlap (peer)', async () => {
      t.rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.KORLAP },
        location_id: 'area1',
      });
      await expect(t.service.setLeave('d1', 'sick', undefined, KORLAP)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('kepala_rayon can edit a korlap in their district', async () => {
      allowRow({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.KORLAP },
        district_id: 'r1',
        location_id: null,
      });
      await expect(t.service.setLeave('d1', 'sick', undefined, KEPALA)).resolves.toBeDefined();
    });

    it('kepala_rayon CANNOT edit a worker in a different district', async () => {
      t.rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        district_id: 'r2',
        location_id: null,
      });
      await expect(t.service.setLeave('d1', 'sick', undefined, KEPALA)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('management can edit any role (full admin_system parity) — kepala_rayon and satgas', async () => {
      allowRow({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.KEPALA_RAYON },
        district_id: 'r1',
        location_id: null,
      });
      await expect(t.service.setLeave('d1', 'sick', undefined, TOP)).resolves.toBeDefined();

      allowRow({
        id: 'd2',
        user_id: 'B',
        user: { role: UserRole.SATGAS },
        district_id: 'r1',
        location_id: null,
      });
      await expect(t.service.setLeave('d2', 'sick', undefined, TOP)).resolves.toBeDefined();
    });
  });

  describe('generateRoster — event-based materialization', () => {
    it('returns 0 when no active events exist', async () => {
      t.eventRepo.find.mockResolvedValue([]);

      const created = await t.service.generateRoster('2026-07-01', 'admin');

      expect(created).toBe(0);
      expect(t.materializer.materializeEvent).not.toHaveBeenCalled();
    });

    it('materializes multiple events and sums their created counts', async () => {
      t.eventRepo.find.mockResolvedValue([
        { id: 'e1', is_active: true },
        { id: 'e2', is_active: true },
        { id: 'e3', is_active: true },
      ]);
      t.materializer.materializeEvent
        .mockResolvedValueOnce({
          created: 2,
          skipped: [{ user_id: 'u1', date: '2026-07-01', reason: 'overlap' }],
        })
        .mockResolvedValueOnce({ created: 4, skipped: [] })
        .mockResolvedValueOnce({ created: 1, skipped: [] });

      const created = await t.service.generateRoster('2026-07-01', 'admin');

      expect(created).toBe(7); // 2 + 4 + 1
    });
  });
});
