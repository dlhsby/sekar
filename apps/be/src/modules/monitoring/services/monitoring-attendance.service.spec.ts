import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import { MonitoringAttendanceService } from './monitoring-attendance.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Location } from '../../locations/entities/location.entity';

/**
 * These tests are organised around the four defects the superseded
 * `/supervisor/attendance` had, because a reimplementation is only worth doing
 * if it does not reproduce them.
 */
describe('MonitoringAttendanceService', () => {
  let service: MonitoringAttendanceService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let shiftsRepository: jest.Mocked<Repository<Shift>>;
  let locationsRepository: jest.Mocked<Repository<Location>>;
  let qb: {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };

  const LOCATION: Location = { id: 'loc-1', name: 'Taman Bungkul' } as Location;

  const user = (id: string, role: UserRole, over: Partial<User> = {}): User =>
    ({
      id,
      username: id,
      full_name: `Worker ${id}`,
      role,
      is_active: true,
      location_id: 'loc-1',
      ...over,
    }) as User;

  const shift = (id: string, u: User, over: Partial<Shift> = {}): Shift =>
    ({
      id,
      user: u,
      user_id: u.id,
      location_id: 'loc-1',
      clock_in_time: new Date('2026-03-05T01:00:00Z'),
      clock_out_time: null,
      clock_in_outside_boundary: false,
      clock_out_outside_boundary: false,
      service_day: '2026-03-05',
      ...over,
    }) as Shift;

  beforeEach(async () => {
    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringAttendanceService,
        {
          provide: getRepositoryToken(User),
          useValue: { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Shift),
          useValue: { createQueryBuilder: jest.fn(() => qb) },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: { find: jest.fn().mockResolvedValue([LOCATION]) },
        },
      ],
    }).compile();

    service = module.get(MonitoringAttendanceService);
    usersRepository = module.get(getRepositoryToken(User));
    shiftsRepository = module.get(getRepositoryToken(Shift));
    locationsRepository = module.get(getRepositoryToken(Location));
  });

  describe('roster (defect 1: satgas-only)', () => {
    it('counts linmas as well as satgas', async () => {
      await service.getAttendance({ date: '2026-03-05' });

      const where = usersRepository.find.mock.calls[0][0]!.where as Record<string, unknown>;
      // `In([...])` keeps its values on `_value`.
      expect((where.role as { _value: string[] })._value).toEqual(
        expect.arrayContaining([UserRole.SATGAS, UserRole.LINMAS]),
      );
    });

    it('excludes inactive and soft-deleted workers', async () => {
      await service.getAttendance({ date: '2026-03-05' });

      const where = usersRepository.find.mock.calls[0][0]!.where as Record<string, unknown>;
      expect(where.is_active).toBe(true);
      expect(where.deleted_at).toBeDefined();
    });
  });

  describe('day bounds (defect 2: server-local time)', () => {
    it('brackets the WIB day, not the server day', async () => {
      await service.getAttendance({ date: '2026-03-05' });

      const params = qb.where.mock.calls[0][1];
      expect(params.dateStr).toBe('2026-03-05');
      expect(params.start.toISOString()).toBe('2026-03-04T17:00:00.000Z');
      expect(params.end.toISOString()).toBe('2026-03-05T17:00:00.000Z');
    });
  });

  /**
   * Regression: the join used `shift.location`, but the Area→Location rename
   * moved the COLUMN to `location_id` while leaving the entity PROPERTY as
   * `area`. TypeORM resolves join paths by property name, so every call threw
   * "Relation with property path location in entity was not found" -- a 500 on
   * both endpoints, in merged code, found only by calling it against a real
   * database.
   *
   * These tests mock `createQueryBuilder`, so the ORM never validates the
   * string and a wrong path stays invisible. Asserting the exact path is the
   * cheapest guard available at this level; the real one is exercising the
   * endpoint against a live DB, which no unit test does.
   */
  describe('join paths (regression: property name vs column name)', () => {
    it('joins shift.area — the PROPERTY — not shift.location, the column', async () => {
      await service.getAttendance({ date: '2026-03-05' });

      const joined = qb.leftJoinAndSelect.mock.calls.map((c) => c[0]);
      expect(joined).toContain('shift.area');
      expect(joined).not.toContain('shift.location');
    });

    it('joins the user relation', async () => {
      await service.getAttendance({ date: '2026-03-05' });

      expect(qb.leftJoinAndSelect.mock.calls.map((c) => c[0])).toContain('shift.user');
    });
  });

  describe('session matching (defect 3: clock_in_time vs service_day)', () => {
    it('matches on service_day, falling back to clock-in only for rows without one', async () => {
      await service.getAttendance({ date: '2026-03-05' });

      const sql = qb.where.mock.calls[0][0] as string;
      expect(sql).toContain('shift.service_day = :dateStr');
      expect(sql).toContain('shift.service_day IS NULL');
    });

    it("attributes a night worker's 00:30 clock-in to the previous service day", async () => {
      const nightWorker = user('night-1', UserRole.SATGAS);
      usersRepository.find.mockResolvedValue([nightWorker]);
      // Clock-in is on the 6th; the session belongs to the 5th.
      qb.getMany.mockResolvedValue([
        shift('s-night', nightWorker, {
          clock_in_time: new Date('2026-03-05T17:30:00Z'),
          service_day: '2026-03-05',
        }),
      ]);

      const result = await service.getAttendance({ date: '2026-03-05' });

      expect(result.clocked_in_count).toBe(1);
      expect(result.not_clocked_in.data).toHaveLength(0);
    });
  });

  describe('per-worker collapse (defect 4: one row per shift)', () => {
    it('counts a worker with two sessions once', async () => {
      const w = user('w-1', UserRole.SATGAS);
      usersRepository.find.mockResolvedValue([w]);
      qb.getMany.mockResolvedValue([
        shift('s-1', w, {
          clock_in_time: new Date('2026-03-05T01:00:00Z'),
          clock_out_time: new Date('2026-03-05T04:00:00Z'),
        }),
        shift('s-2', w, {
          clock_in_time: new Date('2026-03-05T06:00:00Z'),
          clock_out_time: new Date('2026-03-05T09:00:00Z'),
        }),
      ]);

      const result = await service.getAttendance({ date: '2026-03-05' });

      expect(result.clocked_in_count).toBe(1);
      expect(result.clocked_in.data).toHaveLength(1);
      // Earliest in, latest out.
      expect(result.clocked_in.data[0].clock_in_time).toBe('2026-03-05T01:00:00.000Z');
      expect(result.clocked_in.data[0].clock_out_time).toBe('2026-03-05T09:00:00.000Z');
    });

    it('reports no clock-out while any session is still open', async () => {
      const w = user('w-1', UserRole.SATGAS);
      usersRepository.find.mockResolvedValue([w]);
      qb.getMany.mockResolvedValue([
        shift('s-1', w, { clock_out_time: new Date('2026-03-05T04:00:00Z') }),
        shift('s-2', w, { clock_in_time: new Date('2026-03-05T06:00:00Z'), clock_out_time: null }),
      ]);

      const result = await service.getAttendance({ date: '2026-03-05' });

      expect(result.clocked_in.data[0].clock_out_time).toBeNull();
    });
  });

  describe('counts', () => {
    it('never lets a non-roster clock-in exceed the roster', async () => {
      const satgas = user('w-1', UserRole.SATGAS);
      const korlap = user('k-1', UserRole.KORLAP);
      usersRepository.find.mockResolvedValue([satgas]); // roster excludes korlap
      qb.getMany.mockResolvedValue([shift('s-1', satgas), shift('s-2', korlap)]);

      const result = await service.getAttendance({ date: '2026-03-05' });

      expect(result.total_workers).toBe(1);
      expect(result.clocked_in_count).toBe(1);
      expect(result.clocked_in_count).toBeLessThanOrEqual(result.total_workers);
    });

    it('splits the roster into clocked-in and not', async () => {
      const a = user('a', UserRole.SATGAS);
      const b = user('b', UserRole.LINMAS);
      usersRepository.find.mockResolvedValue([a, b]);
      qb.getMany.mockResolvedValue([shift('s-a', a)]);

      const result = await service.getAttendance({ date: '2026-03-05' });

      expect(result.total_workers).toBe(2);
      expect(result.clocked_in_count).toBe(1);
      expect(result.not_clocked_in.data.map((w) => w.id)).toEqual(['b']);
    });
  });

  describe('locations', () => {
    it('resolves every location in ONE query, not one per worker', async () => {
      const workers = Array.from({ length: 10 }, (_, i) => user(`w-${i}`, UserRole.SATGAS));
      usersRepository.find.mockResolvedValue(workers);

      await service.getAttendance({ date: '2026-03-05' });

      expect(locationsRepository.find).toHaveBeenCalledTimes(1);
    });

    it('attaches the location name to each row', async () => {
      const w = user('w-1', UserRole.SATGAS);
      usersRepository.find.mockResolvedValue([w]);

      const result = await service.getAttendance({ date: '2026-03-05' });

      expect(result.not_clocked_in.data[0].area).toEqual({ id: 'loc-1', name: 'Taman Bungkul' });
    });

    it('tolerates a worker with no location', async () => {
      const w = user('w-1', UserRole.SATGAS, { location_id: undefined });
      usersRepository.find.mockResolvedValue([w]);
      locationsRepository.find.mockResolvedValue([]);

      const result = await service.getAttendance({ date: '2026-03-05' });

      expect(result.not_clocked_in.data[0].area).toBeNull();
    });
  });

  describe('getUserAttendanceDetail', () => {
    it('throws when the user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserAttendanceDetail('nope', '2026-03-05')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns every session on the day, not just the first', async () => {
      const w = user('w-1', UserRole.SATGAS);
      usersRepository.findOne.mockResolvedValue(w);
      qb.getMany.mockResolvedValue([
        shift('s-1', w, { clock_out_time: new Date('2026-03-05T04:00:00Z') }),
        shift('s-2', w, { clock_in_time: new Date('2026-03-05T06:00:00Z') }),
      ]);

      const result = await service.getUserAttendanceDetail('w-1', '2026-03-05');

      expect(result.clocked_in).toBe(true);
      expect(result.shifts).toHaveLength(2);
    });

    it('computes duration for a closed session and leaves an open one null', async () => {
      const w = user('w-1', UserRole.SATGAS);
      usersRepository.findOne.mockResolvedValue(w);
      qb.getMany.mockResolvedValue([
        shift('s-1', w, { clock_out_time: new Date('2026-03-05T04:00:00Z') }), // 3h
        shift('s-2', w, { clock_in_time: new Date('2026-03-05T06:00:00Z'), clock_out_time: null }),
      ]);

      const result = await service.getUserAttendanceDetail('w-1', '2026-03-05');

      expect(result.shifts[0].duration_minutes).toBe(180);
      expect(result.shifts[1].duration_minutes).toBeNull();
    });

    it('reports not-clocked-in when the day has no sessions', async () => {
      const w = user('w-1', UserRole.SATGAS);
      usersRepository.findOne.mockResolvedValue(w);
      qb.getMany.mockResolvedValue([]);

      const result = await service.getUserAttendanceDetail('w-1', '2026-03-05');

      expect(result.clocked_in).toBe(false);
      expect(result.shifts).toEqual([]);
    });

    it('ignores sessions belonging to other users', async () => {
      const w = user('w-1', UserRole.SATGAS);
      const other = user('w-2', UserRole.SATGAS);
      usersRepository.findOne.mockResolvedValue(w);
      qb.getMany.mockResolvedValue([shift('s-other', other)]);

      const result = await service.getUserAttendanceDetail('w-1', '2026-03-05');

      expect(result.shifts).toHaveLength(0);
    });
  });

  describe('pagination', () => {
    it('slices the not-clocked-in list while reporting the full total', async () => {
      const workers = Array.from({ length: 12 }, (_, i) => user(`w-${i}`, UserRole.SATGAS));
      usersRepository.find.mockResolvedValue(workers);

      const result = await service.getAttendance({ date: '2026-03-05', page: 2, limit: 5 });

      expect(result.not_clocked_in.data).toHaveLength(5);
      expect(result.not_clocked_in.data[0].id).toBe('w-5');
      expect(result.not_clocked_in.meta.total).toBe(12);
    });

    it('defaults to today in WIB when no date is given', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-04T20:00:00Z')); // 03:00 WIB on the 5th
      try {
        const result = await service.getAttendance({});
        expect(result.date).toBe('2026-03-05');
      } finally {
        jest.useRealTimers();
      }
    });
  });

  it('is defined', () => {
    expect(service).toBeDefined();
    expect(shiftsRepository.createQueryBuilder).toBeDefined();
  });
});
