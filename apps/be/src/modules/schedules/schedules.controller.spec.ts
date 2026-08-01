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
  // ---------------------------------------------------------------------------
  describe('range size guard', () => {
    it('serves a normal range', async () => {
      service.countByDateRange.mockResolvedValue(31_000);
      await expect(controller.getByRange('2026-07-01', '2026-07-31', admin)).resolves.toEqual([]);
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
