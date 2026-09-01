import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { RosterPresenceService } from './services/roster-presence.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('SchedulesController (district scoping)', () => {
  let controller: SchedulesController;
  let service: {
    countByDateRange: jest.Mock;
    findByDateRange: jest.Mock;
    findByDateRangeForUser: jest.Mock;
    findByDate: jest.Mock;
    findByUserAndDate: jest.Mock;
    findOne: jest.Mock;
    getDaySummary: jest.Mock;
    setLeave: jest.Mock;
    generateRoster: jest.Mock;
    addForDay: jest.Mock;
  };

  const kepala = { id: 'k1', role: UserRole.KEPALA_RAYON, district_id: 'r1' } as unknown as User;
  const admin = { id: 'a1', role: UserRole.SUPERADMIN, district_id: null } as unknown as User;

  beforeEach(async () => {
    service = {
      countByDateRange: jest.fn().mockResolvedValue(10),
      findByDateRange: jest.fn().mockResolvedValue([]),
      findByDateRangeForUser: jest.fn().mockResolvedValue([]),
      findByDate: jest.fn().mockResolvedValue([]),
      findByUserAndDate: jest.fn().mockResolvedValue(null),
      findOne: jest.fn(),
      getDaySummary: jest.fn(),
      setLeave: jest.fn().mockResolvedValue({}),
      generateRoster: jest.fn().mockResolvedValue(3),
      addForDay: jest.fn().mockResolvedValue({ id: 'new' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulesController],
      providers: [
        { provide: SchedulesService, useValue: service },
        // Presence enrichment is pass-through here: these tests are about
        // district scoping, and a real derivation would need a DB.
        { provide: RosterPresenceService, useValue: { attach: jest.fn((rows) => rows) } },
      ],
    }).compile();
    controller = module.get(SchedulesController);
  });

  it('forces a kepala_rayon to its own district, ignoring the query', async () => {
    await controller.getByDate('2026-06-30', kepala, 'r2');
    expect(service.findByDate).toHaveBeenCalledWith('2026-06-30', 'r1');
  });

  it('lets a global admin pass an explicit district filter', async () => {
    await controller.getByDate('2026-06-30', admin, 'r2');
    expect(service.findByDate).toHaveBeenCalledWith('2026-06-30', 'r2');
  });

  it('returns nothing for a district-scoped user with no district_id (no leak)', async () => {
    const scopedNoDistrict = {
      id: 'k2',
      role: UserRole.KEPALA_RAYON,
      district_id: null,
    } as unknown as User;
    const result = await controller.getByDate('2026-06-30', scopedNoDistrict, 'r2');
    expect(result).toEqual([]);
    expect(service.findByDate).not.toHaveBeenCalled();
  });

  // The fine-grained edit permission (role hierarchy + district/area scope) now
  // lives in SchedulesService.assertCanEdit — the controller just delegates,
  // passing the full editing user. See schedules.service.spec for the matrix.
  it('delegates setLeave to the service with the editing user', async () => {
    await controller.setLeave('d1', { leave_type: 'sick', notes: 'x' }, kepala);
    expect(service.setLeave).toHaveBeenCalledWith('d1', 'sick', 'x', kepala);
  });

  it('delegates addSchedule to the service with the editing user', async () => {
    const dto = { user_id: 'W', date: '2026-07-04' };
    await controller.addSchedule(dto, kepala);
    expect(service.addForDay).toHaveBeenCalledWith(dto, kepala);
  });
  // ---------------------------------------------------------------------------
  // Range size guard. The 62-day cap bounds the DATE span but not the row count,
  // and the API runs at --max-old-space-size=384: a big enough unfiltered range
  // is an OOM, which takes the container down for everyone. A 400 does not.
  //
  // Since ADR-057 nothing asks for a wide unfiltered range — the board fetches
  // one container at a time and the grids read aggregates — so the ceiling came
  // down from 60k to 20k, which is where it actually protects something.
  // ---------------------------------------------------------------------------
  describe('range size guard', () => {
    it('serves a normal range', async () => {
      // What a real caller asks for now: one rayon-scoped container on a peak
      // day, measured at ~1.2k rows.
      service.countByDateRange.mockResolvedValue(1_200);
      await expect(controller.getByRange('2026-07-01', '2026-07-31', admin)).resolves.toEqual([]);
    });

    it('refuses what the month grid used to ask for', async () => {
      // 31k rows was a routine month-wide request before the grids read counts;
      // now it means a client has regressed to fetching a range wholesale.
      service.countByDateRange.mockResolvedValue(31_000);
      await expect(controller.getByRange('2026-07-01', '2026-07-31', admin)).rejects.toThrow(
        /31,000 rows.*Narrow it/s,
      );
      expect(service.findByDateRange).not.toHaveBeenCalled();
    });

    it('refuses a range too large to serialize, and says how to narrow it', async () => {
      service.countByDateRange.mockResolvedValue(250_000);
      await expect(controller.getByRange('2026-07-01', '2026-08-31', admin)).rejects.toThrow(
        /250,000 rows.*Narrow it/s,
      );
      // The point of the guard: the expensive query never runs.
      expect(service.findByDateRange).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // GET /schedules/:id — reading one row.
  //
  // The web edit modal used to fetch the whole unscoped day and `.find()` the
  // row on the client: 190 MB and 5.4 s on staging-sized data to read one
  // record. These lock in that the single-row read exists and stays scoped.
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // GET /schedules/day-summary — the collapsed board, as counts.
  //
  // It MUST scope identically to /schedules/range: a card's headcount that
  // disagrees with the rows it expands to is worse than a slow board.
  // ---------------------------------------------------------------------------
  describe('getDaySummary', () => {
    const emptySummary = {
      date: '2026-07-08',
      groups: [],
      workers: { districts: [], regions: [], locations: [], city: 0 },
    };

    beforeEach(() => {
      service.getDaySummary = jest.fn().mockResolvedValue(emptySummary);
    });

    it('rejects a malformed date', () => {
      // Thrown synchronously, like `getYearSummary` beside it — the validation
      // runs before any promise is returned.
      expect(() => controller.getDaySummary('08-07-2026', admin)).toThrow(/YYYY-MM-DD/);
      expect(service.getDaySummary).not.toHaveBeenCalled();
    });

    it('passes a city role its filters through', async () => {
      await controller.getDaySummary('2026-07-08', admin, 'd1', 'r1', undefined, undefined, 'sd1');
      expect(service.getDaySummary).toHaveBeenCalledWith(
        '2026-07-08',
        expect.objectContaining({ districtId: 'd1', regionId: 'r1', shiftDefinitionId: 'sd1' }),
      );
    });

    it('pins a district-scoped role to its own rayon, ignoring the query', async () => {
      await controller.getDaySummary('2026-07-08', kepala, 'other-district');
      expect(service.getDaySummary).toHaveBeenCalledWith(
        '2026-07-08',
        expect.objectContaining({ districtId: 'r1' }),
      );
    });

    it('self-scopes a worker to their own rows', async () => {
      const satgas = { id: 'w1', role: UserRole.SATGAS, district_id: 'r1' } as unknown as User;
      await controller.getDaySummary('2026-07-08', satgas, 'd1');
      expect(service.getDaySummary).toHaveBeenCalledWith('2026-07-08', { userId: 'w1' });
    });

    it('returns an empty summary for a district-scoped user with no district', async () => {
      const orphan = {
        id: 'k2',
        role: UserRole.KEPALA_RAYON,
        district_id: null,
      } as unknown as User;
      await expect(controller.getDaySummary('2026-07-08', orphan)).resolves.toEqual(
        expect.objectContaining({ groups: [], workers: expect.objectContaining({ city: 0 }) }),
      );
      expect(service.getDaySummary).not.toHaveBeenCalled();
    });
  });

  describe('getOne', () => {
    it('returns the row for a city-scoped role', async () => {
      const row = { id: 's1', district_id: 'r2' };
      service.findOne.mockResolvedValue(row);
      await expect(controller.getOne('s1', admin)).resolves.toEqual(row);
      expect(service.findOne).toHaveBeenCalledWith('s1');
    });

    it('returns a district-scoped role its own rayon row', async () => {
      service.findOne.mockResolvedValue({ id: 's1', district_id: 'r1' });
      await expect(controller.getOne('s1', kepala)).resolves.toMatchObject({ id: 's1' });
    });

    it("refuses a district-scoped role another rayon's row", async () => {
      service.findOne.mockResolvedValue({ id: 's1', district_id: 'r2' });
      await expect(controller.getOne('s1', kepala)).rejects.toThrow(/another rayon/);
    });
  });
});
