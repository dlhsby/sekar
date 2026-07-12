import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MonitoringStatsService } from './monitoring-stats.service';
import { DayTypeService } from './day-type.service';
import { Location } from '../../locations/entities/location.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { LocationLog } from '../../location/entities/location-log.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import {
  LocationStaffRequirement,
  DayType,
} from '../../location-staff-requirements/entities/location-staff-requirement.entity';
import { UserTrackingStatus } from '../entities/user-tracking-status.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { ScheduleLocation } from '../../schedules/entities/schedule-location.entity';

/**
 * Focused unit tests for MonitoringStatsService.getAggregate — the lightweight
 * "Ringkasan" rollup that powers the monitoring map's summary bubbles.
 */
describe('MonitoringStatsService.getAggregate', () => {
  let service: MonitoringStatsService;

  // A query-builder stub whose getRawMany() returns a queued result per call.
  const makeQb = (results: any[][]) => {
    let call = 0;
    const qb: any = {
      innerJoin: () => qb,
      select: () => qb,
      addSelect: () => qb,
      where: () => qb,
      andWhere: () => qb,
      groupBy: () => qb,
      addGroupBy: () => qb,
      getRawMany: jest.fn(() => Promise.resolve(results[call++] ?? [])),
    };
    return qb;
  };

  const trackingRepo: any = { createQueryBuilder: jest.fn(), find: jest.fn() };
  const staffRepo: any = { createQueryBuilder: jest.fn() };
  const areaRepo: any = { find: jest.fn(), count: jest.fn() };
  const rayonRepo: any = { find: jest.fn() };
  const scheduleRepo: any = { createQueryBuilder: jest.fn() };
  const scheduleAreaRepo: any = { createQueryBuilder: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Default: no roster + nobody clocked in (tests override per-case).
    trackingRepo.find.mockResolvedValue([]);
    scheduleRepo.createQueryBuilder.mockReturnValue(makeQb([[]]));
    scheduleAreaRepo.createQueryBuilder.mockReturnValue(makeQb([[]]));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringStatsService,
        { provide: getRepositoryToken(Location), useValue: areaRepo },
        { provide: getRepositoryToken(Shift), useValue: {} },
        { provide: getRepositoryToken(Task), useValue: {} },
        { provide: getRepositoryToken(Activity), useValue: {} },
        { provide: getRepositoryToken(LocationLog), useValue: {} },
        { provide: getRepositoryToken(Rayon), useValue: rayonRepo },
        { provide: getRepositoryToken(ShiftDefinition), useValue: {} },
        { provide: getRepositoryToken(LocationStaffRequirement), useValue: staffRepo },
        { provide: getRepositoryToken(UserTrackingStatus), useValue: trackingRepo },
        { provide: getRepositoryToken(Schedule), useValue: scheduleRepo },
        { provide: getRepositoryToken(ScheduleLocation), useValue: scheduleAreaRepo },
        {
          provide: DayTypeService,
          useValue: {
            getCurrentDayType: jest.fn().mockResolvedValue(DayType.WEEKDAY),
            getDayTypeLabel: jest.fn().mockReturnValue('Hari Kerja'),
          },
        },
      ],
    }).compile();

    service = module.get(MonitoringStatsService);
    // No current shift → required defaults to 0 unless overridden per test.
    jest.spyOn(service, 'getCurrentShiftDefinition').mockResolvedValue({
      id: 'shift-def-1',
    } as ShiftDefinition);
  });

  it('city scope: builds one node per rayon with grouped status + role counts', async () => {
    rayonRepo.find.mockResolvedValue([
      { id: 'rayon-1', name: 'Rayon Selatan', center_lat: -7.3, center_lng: 112.7 },
      { id: 'rayon-2', name: 'Rayon Utara', center_lat: null, center_lng: null },
    ]);
    areaRepo.find.mockResolvedValue([
      { id: 'area-1', rayon_id: 'rayon-1' },
      { id: 'area-2', rayon_id: 'rayon-1' },
      { id: 'area-3', rayon_id: 'rayon-2' },
    ]);
    // trackingRepo.createQueryBuilder: 1st status, 2nd role, 3rd presence.
    trackingRepo.createQueryBuilder
      .mockReturnValueOnce(
        makeQb([
          [
            { group_id: 'rayon-1', status: 'active', count: '5' },
            { group_id: 'rayon-1', status: 'missing', count: '1' },
            { group_id: 'rayon-2', status: 'active', count: '2' },
          ],
        ]),
      )
      .mockReturnValueOnce(
        makeQb([
          [
            { group_id: 'rayon-1', role: 'satgas', count: '4' },
            { group_id: 'rayon-1', role: 'linmas', count: '2' },
            { group_id: 'rayon-2', role: 'satgas', count: '2' },
          ],
        ]),
      )
      .mockReturnValueOnce(
        // presence (scheduled+clocked-in workers by status × within-area)
        makeQb([
          [
            { group_id: 'rayon-1', status: 'active', within: true, count: '2' },
            { group_id: 'rayon-1', status: 'outside_area', within: false, count: '1' },
            { group_id: 'rayon-1', status: 'inactive', within: true, count: '1' },
          ],
        ]),
      );
    staffRepo.createQueryBuilder.mockReturnValue(makeQb([[{ group_id: 'rayon-1', total: '8' }]]));
    // Roster grouped: rayon-1 has u1,u2,u3; rayon-2 has u4. Then the scope-wide
    // distinct-user query for roster_totals (u1..u4). u1,u2 clocked in.
    scheduleRepo.createQueryBuilder
      .mockReturnValueOnce(
        makeQb([
          [
            { group_id: 'rayon-1', user_id: 'u1' },
            { group_id: 'rayon-1', user_id: 'u2' },
            { group_id: 'rayon-1', user_id: 'u3' },
            { group_id: 'rayon-2', user_id: 'u4' },
          ],
        ]),
      )
      .mockReturnValueOnce(
        makeQb([[{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }, { user_id: 'u4' }]]),
      );
    trackingRepo.find.mockResolvedValue([{ user_id: 'u1' }, { user_id: 'u2' }]);

    const res = await service.getAggregate('city');

    expect(res.scope).toBe('city');
    expect(res.scope_id).toBeNull();
    expect(res.nodes).toHaveLength(2);

    const r1 = res.nodes.find((n) => n.id === 'rayon-1')!;
    expect(r1.type).toBe('rayon');
    expect(r1.center_lat).toBe(-7.3);
    expect(r1.counts_by_status.active).toBe(5);
    expect(r1.counts_by_status.missing).toBe(1);
    expect(r1.counts_by_role).toEqual({ satgas: 4, linmas: 2 });
    expect(r1.online_count).toBe(5); // active only (no inactive/outside)
    expect(r1.worker_count).toBe(6); // 5 active + 1 missing
    expect(r1.required).toBe(8);
    expect(r1.is_understaffed).toBe(true); // 5 online < 8 required
    expect(r1.area_count).toBe(2);

    // Roster trio: 3 scheduled, 2 clocked in (u1,u2), 1 not clocked in.
    expect(r1.roster).toEqual({ scheduled: 3, clocked_in: 2, not_clocked_in: 1 });
    // Presence breakdown of the hadir workers (active→aktif/dalam,
    // outside_area→aktif/luar, inactive→tidak_aktif/dalam).
    expect(r1.presence).toEqual({
      aktif: { dalam: 2, luar: 1 },
      tidak_aktif: { dalam: 1, luar: 0 },
    });

    const r2 = res.nodes.find((n) => n.id === 'rayon-2')!;
    expect(r2.required).toBe(0); // no requirement row → 0
    expect(r2.is_understaffed).toBe(false); // 2 online >= 0 required
    expect(r2.center_lat).toBeNull();
    // u4 scheduled, nobody from rayon-2 clocked in.
    expect(r2.roster).toEqual({ scheduled: 1, clocked_in: 0, not_clocked_in: 1 });

    // Totals sum across rayons.
    expect(res.totals.active).toBe(7);
    expect(res.totals.missing).toBe(1);
    // Roster totals are scope-wide distinct (u1..u4), not Σ nodes — so a
    // rayon-less rostered worker would still be counted here.
    expect(res.roster_totals).toEqual({ scheduled: 4, clocked_in: 2, not_clocked_in: 2 });
    // Presence totals sum across nodes (only rayon-1 has hadir workers).
    expect(res.presence_totals).toEqual({
      aktif: { dalam: 2, luar: 1 },
      tidak_aktif: { dalam: 1, luar: 0 },
    });
  });

  it('rayon scope: builds one node per area in the rayon', async () => {
    areaRepo.find.mockResolvedValue([
      { id: 'area-1', name: 'Taman Bungkul', gps_lat: -7.29, gps_lng: 112.73 },
    ]);
    trackingRepo.createQueryBuilder
      .mockReturnValueOnce(makeQb([[{ group_id: 'area-1', status: 'inactive', count: '3' }]]))
      .mockReturnValueOnce(makeQb([[{ group_id: 'area-1', role: 'satgas', count: '3' }]]))
      .mockReturnValueOnce(
        // presence: u1 clocked in & inactive & inside → tidak_aktif/dalam
        makeQb([[{ group_id: 'area-1', status: 'inactive', within: true, count: '1' }]]),
      );
    staffRepo.createQueryBuilder.mockReturnValue(makeQb([[{ group_id: 'area-1', total: '2' }]]));
    // Roster grouped by area: area-1 has u1,u2,u3 scheduled; only u1 clocked in.
    scheduleAreaRepo.createQueryBuilder.mockReturnValue(
      makeQb([
        [
          { group_id: 'area-1', user_id: 'u1' },
          { group_id: 'area-1', user_id: 'u2' },
          { group_id: 'area-1', user_id: 'u3' },
        ],
      ]),
    );
    // Scope-wide (rayon) distinct roster for roster_totals: u1,u2,u3.
    scheduleRepo.createQueryBuilder.mockReturnValue(
      makeQb([[{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }]]),
    );
    trackingRepo.find.mockResolvedValue([{ user_id: 'u1' }]);

    const res = await service.getAggregate('rayon', 'rayon-1');

    expect(res.scope).toBe('rayon');
    expect(res.scope_id).toBe('rayon-1');
    expect(res.nodes).toHaveLength(1);
    const a1 = res.nodes[0];
    expect(a1.type).toBe('area');
    expect(a1.rayon_id).toBe('rayon-1');
    expect(a1.counts_by_status.inactive).toBe(3);
    expect(a1.online_count).toBe(3); // inactive counts as online
    expect(a1.is_understaffed).toBe(false); // 3 online >= 2 required
    expect(a1.center_lat).toBe(-7.29);
    // 3 scheduled, 1 clocked in (u1), 2 not clocked in.
    expect(a1.roster).toEqual({ scheduled: 3, clocked_in: 1, not_clocked_in: 2 });
    // u1 is inactive & inside → tidak_aktif/dalam.
    expect(a1.presence).toEqual({
      aktif: { dalam: 0, luar: 0 },
      tidak_aktif: { dalam: 1, luar: 0 },
    });
    // Scope-wide totals match the single area here.
    expect(res.roster_totals).toEqual({ scheduled: 3, clocked_in: 1, not_clocked_in: 2 });
  });

  it('rayon scope without id throws NotFound', async () => {
    await expect(service.getAggregate('rayon')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rayon scope with zero areas returns no nodes (no empty-IN query)', async () => {
    areaRepo.find.mockResolvedValue([]); // rayon has no active areas
    const res = await service.getAggregate('rayon', 'rayon-empty');
    expect(res.scope).toBe('rayon');
    expect(res.nodes).toEqual([]);
    expect(res.totals).toEqual({ active: 0, inactive: 0, outside_area: 0, missing: 0, offline: 0 });
    expect(res.roster_totals).toEqual({ scheduled: 0, clocked_in: 0, not_clocked_in: 0 });
    expect(res.presence_totals).toEqual({
      aktif: { dalam: 0, luar: 0 },
      tidak_aktif: { dalam: 0, luar: 0 },
    });
    // No tracking/staff queries issued when there are no areas.
    expect(trackingRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  describe('getBoundaries level=rayon', () => {
    it('returns outlines only (no area geometry) with simplified polygon', async () => {
      rayonRepo.find.mockResolvedValue([
        {
          id: 'rayon-1',
          name: 'Rayon Selatan',
          color: '#7FBC8C',
          center_lat: -7.3,
          center_lng: 112.7,
          // A ring with collinear points that should get simplified away.
          boundary_polygon: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0.5, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
      ]);
      areaRepo.count.mockResolvedValue(4);

      const res = await service.getBoundaries({ level: 'rayon' });

      expect(res.rayons).toHaveLength(1);
      const r = res.rayons[0];
      expect(r.areas).toEqual([]); // no area geometry shipped
      expect(r.area_count).toBe(4);
      // Collinear midpoint [0.5,0] removed by simplification.
      const ring = (r.boundary_polygon as any).coordinates[0];
      expect(ring).not.toContainEqual([0.5, 0]);
      // areaRepository.count used, not find (no geometry load).
      expect(areaRepo.count).toHaveBeenCalled();
    });
  });
});
