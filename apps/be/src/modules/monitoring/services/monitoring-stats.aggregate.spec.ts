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
import { Region } from '../../regions/entities/region.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import {
  LocationStaffRequirement,
  DayType,
} from '../../location-staff-requirements/entities/location-staff-requirement.entity';
import { UserTrackingStatus } from '../entities/user-tracking-status.entity';
import { Schedule, ScheduleLocation } from '../../schedules/entities/schedule.entity';

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
      leftJoin: () => qb,
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
  const locationRepo: any = { find: jest.fn(), count: jest.fn() };
  const rayonRepo: any = { find: jest.fn() };
  const regionRepo: any = { find: jest.fn() };
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
        { provide: getRepositoryToken(Location), useValue: locationRepo },
        { provide: getRepositoryToken(Shift), useValue: {} },
        { provide: getRepositoryToken(Task), useValue: {} },
        { provide: getRepositoryToken(Activity), useValue: {} },
        { provide: getRepositoryToken(LocationLog), useValue: {} },
        { provide: getRepositoryToken(Rayon), useValue: rayonRepo },
        { provide: getRepositoryToken(Region), useValue: regionRepo },
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
    // The off-schedule (Luar jadwal) count calls this; stub it so it doesn't
    // consume a sequenced scheduleRepo query-builder mock.
    jest.spyOn(service, 'scheduledUserIdsForCurrentShift').mockResolvedValue(new Set());
  });

  it('city scope: builds one node per rayon with grouped status + role counts', async () => {
    rayonRepo.find.mockResolvedValue([
      { id: 'rayon-1', name: 'Rayon Selatan', center_lat: -7.3, center_lng: 112.7 },
      { id: 'rayon-2', name: 'Rayon Utara', center_lat: null, center_lng: null },
    ]);
    locationRepo.find.mockResolvedValue([
      { id: 'area-1', rayon_id: 'rayon-1' },
      { id: 'area-2', rayon_id: 'rayon-1' },
      { id: 'area-3', rayon_id: 'rayon-2' },
    ]);
    // trackingRepo.createQueryBuilder order: 1st status, 2nd role,
    // 3rd countable-online (satgas+linmas only — what understaffing is measured
    // on), 4th presence.
    trackingRepo.createQueryBuilder
      .mockReturnValueOnce(
        makeQb([
          [
            { group_id: 'rayon-1', status: 'active', count: '5' },
            { group_id: 'rayon-1', status: 'offline', count: '1' },
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
        // countable-online: online satgas+linmas user ids. rayon-1 has 6 online,
        // but only u1/u2/u3 are on today's roster — u5/u6/u7 are ad-hoc and must
        // NOT count (ADR-050 / Q12). So scheduled-online = 3 < 8 → understaffed.
        // rayon-2: u4 scheduled + u8 ad-hoc, no requirement.
        makeQb([
          [
            { group_id: 'rayon-1', user_id: 'u1' },
            { group_id: 'rayon-1', user_id: 'u2' },
            { group_id: 'rayon-1', user_id: 'u3' },
            { group_id: 'rayon-1', user_id: 'u5' },
            { group_id: 'rayon-1', user_id: 'u6' },
            { group_id: 'rayon-1', user_id: 'u7' },
            { group_id: 'rayon-2', user_id: 'u4' },
            { group_id: 'rayon-2', user_id: 'u8' },
          ],
        ]),
      )
      .mockReturnValueOnce(
        // presence (scheduled+clocked-in workers by status × within-area)
        makeQb([
          [
            { group_id: 'rayon-1', status: 'active', within: true, count: '2' },
            { group_id: 'rayon-1', status: 'active', within: false, count: '1' },
            { group_id: 'rayon-1', status: 'offline', within: true, count: '1' },
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
    // Ad-hoc (Luar jadwal) count is present on the aggregate response.
    expect(typeof res.off_schedule_count).toBe('number');

    const r1 = res.nodes.find((n) => n.id === 'rayon-1')!;
    expect(r1.type).toBe('rayon');
    expect(r1.center_lat).toBe(-7.3);
    expect(r1.counts_by_status.active).toBe(5);
    expect(r1.counts_by_status.offline).toBe(1);
    expect(r1.counts_by_role).toEqual({ satgas: 4, linmas: 2 });
    expect(r1.online_count).toBe(6); // active + offline (clocked-in)
    expect(r1.worker_count).toBe(6); // 5 active + 1 offline (all clocked-in)
    expect(r1.required).toBe(8);
    // Measured on scheduled-online satgas+linmas — 3 of the 6 online are ad-hoc
    // (not rostered) and excluded (ADR-050 / Q12); supervisors never staff a
    // place either (ADR-046). So 3 scheduled-online < 8 required → understaffed.
    expect(r1.is_understaffed).toBe(true);
    expect(r1.area_count).toBe(2);

    // Roster trio: 3 scheduled, 2 clocked in (u1,u2), 1 not clocked in.
    expect(r1.roster).toEqual({ scheduled: 3, clocked_in: 2, belum_hadir: 0, tidak_hadir: 1 });
    // Presence breakdown of the clocked-in workers (active→aktif, offline→tidak_aktif;
    // within/outside is the is_within_area axis).
    expect(r1.presence).toEqual({
      aktif: { dalam: 2, luar: 1 },
      tidak_aktif: { dalam: 1, luar: 0 },
    });

    const r2 = res.nodes.find((n) => n.id === 'rayon-2')!;
    expect(r2.required).toBe(0); // no requirement row → 0
    expect(r2.is_understaffed).toBe(false); // 2 online >= 0 required
    expect(r2.center_lat).toBeNull();
    // u4 scheduled, nobody from rayon-2 clocked in.
    expect(r2.roster).toEqual({ scheduled: 1, clocked_in: 0, belum_hadir: 0, tidak_hadir: 1 });

    // Totals sum across rayons.
    expect(res.totals.active).toBe(7);
    expect(res.totals.offline).toBe(1);
    // Roster totals are scope-wide distinct (u1..u4), not Σ nodes — so a
    // rayon-less rostered worker would still be counted here.
    expect(res.roster_totals).toEqual({
      scheduled: 4,
      clocked_in: 2,
      belum_hadir: 0,
      tidak_hadir: 2,
    });
    // Presence totals sum across nodes (only rayon-1 has hadir workers).
    expect(res.presence_totals).toEqual({
      aktif: { dalam: 2, luar: 1 },
      tidak_aktif: { dalam: 1, luar: 0 },
    });
  });

  it('rayon scope: builds one node per area in the rayon', async () => {
    locationRepo.find.mockResolvedValue([
      { id: 'area-1', name: 'Taman Bungkul', gps_lat: -7.29, gps_lng: 112.73 },
    ]);
    trackingRepo.createQueryBuilder
      .mockReturnValueOnce(makeQb([[{ group_id: 'area-1', status: 'offline', count: '3' }]]))
      .mockReturnValueOnce(makeQb([[{ group_id: 'area-1', role: 'satgas', count: '3' }]]))
      .mockReturnValueOnce(
        // countable-online: online satgas+linmas user ids (intersected with the
        // scheduled set below → 3 scheduled-online ≥ 2 required, not understaffed).
        makeQb([
          [
            { group_id: 'area-1', user_id: 'u1' },
            { group_id: 'area-1', user_id: 'u2' },
            { group_id: 'area-1', user_id: 'u3' },
          ],
        ]),
      )
      .mockReturnValueOnce(
        // presence: u1 clocked in & offline & inside → tidak_aktif/dalam
        makeQb([[{ group_id: 'area-1', status: 'offline', within: true, count: '1' }]]),
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
    // Scope-wide (rayon) distinct roster for roster_totals AND the rayon-wide
    // scheduled set that area presence now unions in (live-position counting) both
    // read scheduleRepo — return a FRESH builder per call so each query is served.
    scheduleRepo.createQueryBuilder.mockImplementation(() =>
      makeQb([[{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }]]),
    );
    trackingRepo.find.mockResolvedValue([{ user_id: 'u1' }]);

    const res = await service.getAggregate('rayon', 'rayon-1');

    expect(res.scope).toBe('rayon');
    expect(res.scope_id).toBe('rayon-1');
    expect(res.nodes).toHaveLength(1);
    const a1 = res.nodes[0];
    expect(a1.type).toBe('location');
    expect(a1.rayon_id).toBe('rayon-1');
    expect(a1.counts_by_status.offline).toBe(3);
    expect(a1.online_count).toBe(3); // offline counts as online (clocked-in)
    expect(a1.is_understaffed).toBe(false); // 3 online >= 2 required
    expect(a1.center_lat).toBe(-7.29);
    // 3 scheduled, 1 clocked in (u1), 2 not clocked in.
    expect(a1.roster).toEqual({ scheduled: 3, clocked_in: 1, belum_hadir: 0, tidak_hadir: 2 });
    // u1 is offline & inside → tidak_aktif/dalam.
    expect(a1.presence).toEqual({
      aktif: { dalam: 0, luar: 0 },
      tidak_aktif: { dalam: 1, luar: 0 },
    });
    // Scope-wide totals match the single area here.
    expect(res.roster_totals).toEqual({
      scheduled: 3,
      clocked_in: 1,
      belum_hadir: 0,
      tidak_hadir: 2,
    });
  });

  it('rayon scope without id throws NotFound', async () => {
    await expect(service.getAggregate('rayon')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rayon scope with zero areas returns no nodes (no empty-IN query)', async () => {
    locationRepo.find.mockResolvedValue([]); // rayon has no active areas
    const res = await service.getAggregate('rayon', 'rayon-empty');
    expect(res.scope).toBe('rayon');
    expect(res.nodes).toEqual([]);
    expect(res.totals).toEqual({ active: 0, offline: 0, absent: 0, outside_area: 0 });
    expect(res.roster_totals).toEqual({
      scheduled: 0,
      clocked_in: 0,
      belum_hadir: 0,
      tidak_hadir: 0,
    });
    expect(res.presence_totals).toEqual({
      aktif: { dalam: 0, luar: 0 },
      tidak_aktif: { dalam: 0, luar: 0 },
    });
    // No tracking/staff queries issued when there are no areas.
    expect(trackingRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('region scope: builds one node per region (kawasan) in the rayon', async () => {
    regionRepo.find.mockResolvedValue([
      { id: 'region-1', name: 'Kawasan Darmo', center_lat: -7.25, center_lng: 112.75 },
      { id: 'region-2', name: 'Kawasan Pusat', center_lat: null, center_lng: null },
    ]);
    locationRepo.find.mockResolvedValue([
      { id: 'area-1', region_id: 'region-1' },
      { id: 'area-2', region_id: 'region-1' },
      { id: 'area-3', region_id: 'region-2' },
    ]);
    // trackingRepo.createQueryBuilder order: 1st status, 2nd role,
    // 3rd countable-online (satgas+linmas only), 4th presence.
    trackingRepo.createQueryBuilder
      .mockReturnValueOnce(
        makeQb([
          [
            { group_id: 'region-1', status: 'active', is_within_area: true, count: '3' },
            { group_id: 'region-1', status: 'offline', is_within_area: false, count: '1' },
            { group_id: 'region-2', status: 'active', is_within_area: true, count: '2' },
          ],
        ]),
      )
      .mockReturnValueOnce(
        makeQb([
          [
            { group_id: 'region-1', role: 'satgas', count: '3' },
            { group_id: 'region-1', role: 'linmas', count: '1' },
            { group_id: 'region-2', role: 'satgas', count: '2' },
          ],
        ]),
      )
      .mockReturnValueOnce(
        // countable-online: online satgas+linmas user ids. region-1 has 4 online,
        // and r1, r2, r3 are on today's roster (all 3 scheduled-online ≥ 3 required).
        // region-2: r4 scheduled + r5 ad-hoc, no requirement.
        makeQb([
          [
            { group_id: 'region-1', user_id: 'r1' },
            { group_id: 'region-1', user_id: 'r2' },
            { group_id: 'region-1', user_id: 'r3' },
            { group_id: 'region-1', user_id: 'r4' },
            { group_id: 'region-2', user_id: 'r5' },
            { group_id: 'region-2', user_id: 'r6' },
          ],
        ]),
      )
      .mockReturnValueOnce(
        // presence (scheduled+clocked-in workers by status × within-area)
        makeQb([
          [
            { group_id: 'region-1', status: 'active', within: true, count: '2' },
            { group_id: 'region-1', status: 'offline', within: false, count: '1' },
          ],
        ]),
      );
    staffRepo.createQueryBuilder.mockReturnValue(
      makeQb([
        [
          { group_id: 'region-1', total: '3' },
          { group_id: 'region-2', total: '4' },
        ],
      ]),
    );
    // Roster grouped by region: region-1 has r1,r2,r3; region-2 has r5.
    scheduleRepo.createQueryBuilder
      .mockReturnValueOnce(
        makeQb([
          [
            { group_id: 'region-1', user_id: 'r1' },
            { group_id: 'region-1', user_id: 'r2' },
            { group_id: 'region-1', user_id: 'r3' },
            { group_id: 'region-2', user_id: 'r5' },
          ],
        ]),
      )
      .mockReturnValueOnce(
        makeQb([[{ user_id: 'r1' }, { user_id: 'r2' }, { user_id: 'r3' }, { user_id: 'r5' }]]),
      );
    trackingRepo.find.mockResolvedValue([{ user_id: 'r1' }, { user_id: 'r2' }]);

    const res = await service.getAggregate('region', 'rayon-1');

    expect(res.scope).toBe('region');
    expect(res.scope_id).toBe('rayon-1');
    expect(res.nodes).toHaveLength(2);

    const rg1 = res.nodes.find((n) => n.id === 'region-1')!;
    expect(rg1.type).toBe('region');
    expect(rg1.center_lat).toBe(-7.25);
    expect(rg1.counts_by_status.active).toBe(3);
    expect(rg1.counts_by_status.offline).toBe(1);
    expect(rg1.counts_by_role).toEqual({ satgas: 3, linmas: 1 });
    expect(rg1.online_count).toBe(4); // active + offline (clocked-in)
    expect(rg1.worker_count).toBe(4);
    expect(rg1.required).toBe(3);
    // Measured on scheduled-online satgas+linmas — r1,r2,r3 are all rostered
    // so 3 scheduled-online >= 3 required → not understaffed.
    expect(rg1.is_understaffed).toBe(false);
    expect(rg1.location_count).toBe(2);

    // Roster trio: 3 scheduled, 2 clocked in (r1,r2), 1 not clocked in.
    expect(rg1.roster).toEqual({ scheduled: 3, clocked_in: 2, belum_hadir: 0, tidak_hadir: 1 });
    // Presence breakdown of the clocked-in workers.
    expect(rg1.presence).toEqual({
      aktif: { dalam: 2, luar: 0 },
      tidak_aktif: { dalam: 0, luar: 1 },
    });

    const rg2 = res.nodes.find((n) => n.id === 'region-2')!;
    expect(rg2.required).toBe(4);
    expect(rg2.is_understaffed).toBe(true); // 2 online < 4 required (r4/r5 only, r5 is ad-hoc)
    expect(rg2.location_count).toBe(1);
    // r5 scheduled, nobody from region-2 clocked in.
    expect(rg2.roster).toEqual({ scheduled: 1, clocked_in: 0, belum_hadir: 0, tidak_hadir: 1 });

    // Totals sum across regions.
    expect(res.totals.active).toBe(5);
    expect(res.totals.offline).toBe(1);
    // Roster totals are scope-wide distinct (r1..r5), not Σ nodes.
    expect(res.roster_totals).toEqual({
      scheduled: 4,
      clocked_in: 2,
      belum_hadir: 0,
      tidak_hadir: 2,
    });
    // Presence totals sum across nodes (only region-1 has hadir workers).
    expect(res.presence_totals).toEqual({
      aktif: { dalam: 2, luar: 0 },
      tidak_aktif: { dalam: 0, luar: 1 },
    });
  });

  it('region scope without id throws NotFound', async () => {
    await expect(service.getAggregate('region')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('region scope with zero regions returns no nodes (no empty-IN query)', async () => {
    regionRepo.find.mockResolvedValue([]); // rayon has no active regions
    const res = await service.getAggregate('region', 'rayon-empty');
    expect(res.scope).toBe('region');
    expect(res.nodes).toEqual([]);
    expect(res.totals).toEqual({ active: 0, offline: 0, absent: 0, outside_area: 0 });
    expect(res.roster_totals).toEqual({
      scheduled: 0,
      clocked_in: 0,
      belum_hadir: 0,
      tidak_hadir: 0,
    });
    expect(res.presence_totals).toEqual({
      aktif: { dalam: 0, luar: 0 },
      tidak_aktif: { dalam: 0, luar: 0 },
    });
    // No tracking/staff queries issued when there are no regions.
    expect(trackingRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  describe('getBoundaries level=rayon', () => {
    it('returns outlines only (no area geometry) with simplified polygon', async () => {
      rayonRepo.find.mockResolvedValue([
        {
          id: 'rayon-1',
          name: 'Rayon Selatan',
          border_color: '#7FBC8C',
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
      locationRepo.count.mockResolvedValue(4);

      const res = await service.getBoundaries({ level: 'rayon' });

      expect(res.rayons).toHaveLength(1);
      const r = res.rayons[0];
      expect(r.areas).toEqual([]); // no area geometry shipped
      expect(r.area_count).toBe(4);
      // Collinear midpoint [0.5,0] removed by simplification.
      const ring = (r.boundary_polygon as any).coordinates[0];
      expect(ring).not.toContainEqual([0.5, 0]);
      // areaRepository.count used, not find (no geometry load).
      expect(locationRepo.count).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Staffing correctness (Phase 5.0). Two defects lived here, both invisible to a
// green suite because the fixtures never crossed a role with a requirement, and
// never put a requirement anywhere but a lokasi.
// ---------------------------------------------------------------------------

describe('MonitoringStatsService — staffing correctness', () => {
  it('measures understaffing on satgas+linmas, not on every monitorable role', () => {
    // A korlap standing in a park is monitorable but does not staff it. Before
    // the fix, `is_understaffed` compared ALL online roles against a
    // satgas+linmas requirement, so a supervisor could mask a real shortfall.
    const assemble = (
      MonitoringStatsService.prototype as unknown as {
        assembleNode: (i: Record<string, unknown>) => { is_understaffed: boolean };
      }
    ).assembleNode;

    const node = assemble.call(
      {
        emptyStatusCounts: () => ({
          active: 0,
          inactive: 0,
          outside_area: 0,
          missing: 0,
          offline: 0,
        }),
      },
      {
        id: 'area-1',
        name: 'Taman Bungkul',
        type: 'area',
        counts_by_status: { active: 5, inactive: 0, outside_area: 0, missing: 0, offline: 0 },
        required: 4,
        // 5 online, but only 2 of them are satgas/linmas → still short of 4.
        countable_online: 2,
      },
    );

    expect(node.is_understaffed).toBe(true);
  });

  it('falls back to all-roles online only when no countable figure is supplied', () => {
    // Defensive: a caller that has not been migrated must not silently report
    // everything as understaffed.
    const assemble = (
      MonitoringStatsService.prototype as unknown as {
        assembleNode: (i: Record<string, unknown>) => { is_understaffed: boolean };
      }
    ).assembleNode;

    const node = assemble.call(
      {
        emptyStatusCounts: () => ({
          active: 0,
          inactive: 0,
          outside_area: 0,
          missing: 0,
          offline: 0,
        }),
      },
      {
        id: 'area-1',
        name: 'Taman Bungkul',
        type: 'area',
        counts_by_status: { active: 5, inactive: 0, outside_area: 0, missing: 0, offline: 0 },
        required: 4,
      },
    );

    expect(node.is_understaffed).toBe(false);
  });

  describe('isBeforeShiftGrace (belum_hadir vs tidak_hadir split)', () => {
    // No DI needed — call on the prototype with a bare `this` carrying only the
    // sibling helper it uses (cacheService undefined → default 900s grace), same
    // style as the assembleNode test above.
    const proto = MonitoringStatsService.prototype as unknown as {
      isBeforeShiftGrace: (s: ShiftDefinition | null) => Promise<boolean>;
      shiftCrossesMidnight: (s: ShiftDefinition) => boolean;
    };
    const ctx = { shiftCrossesMidnight: proto.shiftCrossesMidnight };
    const call = (shift: Partial<ShiftDefinition> | null) =>
      proto.isBeforeShiftGrace.call(ctx, shift as ShiftDefinition | null);

    afterEach(() => jest.useRealTimers());

    it('returns false for no shift / a shift without a window (→ tidak_hadir)', async () => {
      expect(await call(null)).toBe(false);
      expect(await call({ id: 's' })).toBe(false);
    });

    it('returns true within the opening grace window (→ belum_hadir)', async () => {
      // Shift starts 06:00 WIB; freeze "now" at 06:05 WIB (inside default 15-min grace).
      jest.useFakeTimers().setSystemTime(new Date('2026-07-19T06:05:00+07:00'));
      expect(await call({ start_time: '06:00:00', end_time: '15:00:00' })).toBe(true);
    });

    it('returns false once past the grace window (→ tidak_hadir)', async () => {
      // Freeze at 09:30 WIB — well past 06:00 + 15-min grace.
      jest.useFakeTimers().setSystemTime(new Date('2026-07-19T09:30:00+07:00'));
      expect(await call({ start_time: '06:00:00', end_time: '15:00:00' })).toBe(false);
    });
  });
});
