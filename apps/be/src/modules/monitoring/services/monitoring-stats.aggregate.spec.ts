import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MonitoringStatsService } from './monitoring-stats.service';
import { DayTypeService } from './day-type.service';
import { Area } from '../../areas/entities/area.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { LocationLog } from '../../location/entities/location-log.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import {
  AreaStaffRequirement,
  DayType,
} from '../../area-staff-requirements/entities/area-staff-requirement.entity';
import { UserTrackingStatus } from '../entities/user-tracking-status.entity';

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

  const trackingRepo: any = { createQueryBuilder: jest.fn() };
  const staffRepo: any = { createQueryBuilder: jest.fn() };
  const areaRepo: any = { find: jest.fn(), count: jest.fn() };
  const rayonRepo: any = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringStatsService,
        { provide: getRepositoryToken(Area), useValue: areaRepo },
        { provide: getRepositoryToken(Shift), useValue: {} },
        { provide: getRepositoryToken(Task), useValue: {} },
        { provide: getRepositoryToken(Activity), useValue: {} },
        { provide: getRepositoryToken(LocationLog), useValue: {} },
        { provide: getRepositoryToken(Rayon), useValue: rayonRepo },
        { provide: getRepositoryToken(ShiftDefinition), useValue: {} },
        { provide: getRepositoryToken(AreaStaffRequirement), useValue: staffRepo },
        { provide: getRepositoryToken(UserTrackingStatus), useValue: trackingRepo },
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
    // 1st QB call (status), 2nd (role): trackingRepo.createQueryBuilder used twice.
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
      );
    staffRepo.createQueryBuilder.mockReturnValue(makeQb([[{ group_id: 'rayon-1', total: '8' }]]));

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

    const r2 = res.nodes.find((n) => n.id === 'rayon-2')!;
    expect(r2.required).toBe(0); // no requirement row → 0
    expect(r2.is_understaffed).toBe(false); // 2 online >= 0 required
    expect(r2.center_lat).toBeNull();

    // Totals sum across rayons.
    expect(res.totals.active).toBe(7);
    expect(res.totals.missing).toBe(1);
  });

  it('rayon scope: builds one node per area in the rayon', async () => {
    areaRepo.find.mockResolvedValue([
      { id: 'area-1', name: 'Taman Bungkul', gps_lat: -7.29, gps_lng: 112.73 },
    ]);
    trackingRepo.createQueryBuilder
      .mockReturnValueOnce(makeQb([[{ group_id: 'area-1', status: 'inactive', count: '3' }]]))
      .mockReturnValueOnce(makeQb([[{ group_id: 'area-1', role: 'satgas', count: '3' }]]));
    staffRepo.createQueryBuilder.mockReturnValue(makeQb([[{ group_id: 'area-1', total: '2' }]]));

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
