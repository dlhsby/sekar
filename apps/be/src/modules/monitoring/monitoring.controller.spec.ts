import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringConfigService } from './services/monitoring-config.service';
import { MonitoringStatsService } from './services/monitoring-stats.service';
import { MonitoringReassignService } from './services/monitoring-reassign.service';
import { AreaPlantStatusService } from './services/area-plant-status.service';
import { AuditLogService } from '../audit/audit.service';
import { CityStatsDto } from './dto/city-stats.dto';
import { RayonStatsDto } from './dto/rayon-stats.dto';
import { AreaStatsDto } from './dto/area-stats.dto';
import { LiveUsersResponseDto, LiveUsersFilterDto } from './dto/live-users.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { TrackingStatus } from './entities/user-tracking-status.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserLocationsService } from '../../modules/user-locations/user-locations.service';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let service: jest.Mocked<MonitoringService>;

  const mockSuperadmin = {
    id: 'superadmin-uuid',
    username: 'superadmin',
    password_hash: 'hashed',
    full_name: 'Super Admin',
    role: UserRole.SUPERADMIN,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as User;

  const mockKepalaRayon = {
    id: 'kepala-rayon-uuid',
    username: 'kepala_rayon1',
    password_hash: 'hashed',
    full_name: 'Kepala Rayon 1',
    role: UserRole.KEPALA_RAYON,
    is_active: true,
    rayon_id: 'rayon-1',
    created_at: new Date(),
    updated_at: new Date(),
  } as User;

  const mockKorlap = {
    id: 'korlap-uuid',
    username: 'korlap1',
    password_hash: 'hashed',
    full_name: 'Korlap 1',
    role: UserRole.KORLAP,
    is_active: true,
    rayon_id: 'rayon-1',
    location_id: 'area-1',
    created_at: new Date(),
    updated_at: new Date(),
  } as User;

  const mockAdminData = {
    id: 'admin-data-uuid',
    username: 'admindata1',
    password_hash: 'hashed',
    full_name: 'Admin Data 1',
    role: UserRole.ADMIN_RAYON,
    is_active: true,
    rayon_id: 'rayon-1',
    created_at: new Date(),
    updated_at: new Date(),
  } as User;

  const mockCityStats: CityStatsDto = {
    total_rayons: 7,
    total_areas: 50,
    total_workers: 200,
    workers_online: 150,
    workers_offline: 50,
    active_shifts: 120,
    tasks_pending: 30,
    tasks_in_progress: 45,
    tasks_completed_today: 25,
    activities_submitted_today: 100,
    rayons: [
      {
        id: 'rayon-1',
        name: 'Rayon Selatan',
        area_count: 10,
        worker_count: 30,
        workers_online: 25,
        workers_offline: 5,
        workers_required: 28,
        is_fully_staffed: false,
      },
    ],
    generated_at: new Date(),
  };

  const mockRayonStats: RayonStatsDto = {
    id: 'rayon-1',
    name: 'Rayon Selatan',
    total_areas: 10,
    total_workers: 30,
    workers_online: 25,
    workers_offline: 5,
    active_shifts: 25,
    tasks_pending: 5,
    tasks_in_progress: 10,
    tasks_completed_today: 8,
    activities_submitted_today: 20,
    areas: [
      {
        id: 'area-1',
        name: 'Taman Bungkul',
        area_type_category: 'active',
        workers_required: 6,
        workers_online: 5,
        workers_offline: 1,
        is_fully_staffed: false,
        staffing_delta: -1,
        tasks_pending: 2,
        tasks_in_progress: 3,
      },
    ],
    shifts: [
      {
        id: 'shift-def-1',
        name: 'Shift 1',
        start_time: '06:00',
        end_time: '15:00',
        is_current: true,
        workers_required: 30,
        workers_on_shift: 25,
      },
    ],
    alerts: ['Taman Bungkul - needs 1 more workers'],
    generated_at: new Date(),
  };

  const mockAreaStats: AreaStatsDto = {
    id: 'area-1',
    name: 'Taman Bungkul',
    area_type: 'Taman',
    area_type_category: 'active',
    rayon_id: 'rayon-1',
    rayon_name: 'Rayon Selatan',
    latitude: -7.2905,
    longitude: 112.7398,
    coverage_area: 2500,
    total_users_assigned: 6,
    users_online: 5,
    users_offline: 1,
    is_fully_staffed: false,
    staff_requirements: [
      {
        id: 'req-1',
        role: UserRole.SATGAS,
        required_count: 6,
        current_count: 5,
        delta: -1,
        is_met: false,
        active_count: 3,
        offline_count: 2,
      },
    ],
    users: [
      {
        id: 'user-1',
        full_name: 'Worker One',
        role: UserRole.SATGAS,
        phone: null,
        status: TrackingStatus.ACTIVE,
        last_lat: -7.2905,
        last_lng: 112.7398,
        last_location_update: new Date(),
        is_within_area: true,
        current_shift_id: 'shift-1',
        shift_name: null,
        clock_in_time: new Date(),
      },
    ],
    tasks_total: 10,
    tasks_pending: 3,
    tasks_in_progress: 4,
    tasks_completed_today: 3,
    active_tasks: [],
    activities_submitted_today: 15,
    alerts: ['Understaffed: need 1 more Worker'],
    current_day_type: 'WEEKDAY',
    current_day_type_label: 'Hari Kerja',
    generated_at: new Date(),
  };

  const mockLiveUsers: LiveUsersResponseDto = {
    total_active: 100,
    total_offline: 50,
    total_absent: 40,
    total_outside_area: 10,
    total_online: 100,
    users: [
      {
        id: 'user-1',
        full_name: 'Worker One',
        role: UserRole.SATGAS,
        phone: '081234567890',
        status: TrackingStatus.ACTIVE,
        activity: 'aktif',
        location: 'dalam_area',
        location_id: 'area-1',
        area_name: 'Taman Bungkul',
        rayon_id: 'rayon-1',
        rayon_name: 'Rayon Selatan',
        latitude: -7.2905,
        longitude: 112.7398,
        accuracy: 10,
        battery_level: 85,
        last_update: new Date(),
        is_within_area: true,
        lifecycle_state: 'bertugas',
        is_late: false,
        lifecycle_flags: [],
        is_scheduled: true,
        outside_boundary: false,
        shift_id: 'shift-1',
        shift_definition_id: null,
        shift_name: 'Shift 1',
        clock_in_time: new Date(),
        current_task_status: null,
        current_task_title: null,
      },
    ],
    expected_count: 0,
    present_count: 0,
    absent_count: 0,
    on_leave_count: 0,
    off_schedule_count: 0,
    absent_users: [],
    generated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        {
          provide: MonitoringService,
          useValue: {
            getCityStats: jest.fn(),
            getRayonStats: jest.fn(),
            getAreaStats: jest.fn(),
            getLiveUsers: jest.fn(),
            getLocationHistory: jest.fn(),
            getUserDaySummary: jest.fn(),
            getStaffingSummary: jest.fn(),
            getSnapshot: jest.fn(),
          },
        },
        {
          provide: MonitoringConfigService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            updateByKey: jest.fn(),
          },
        },
        {
          provide: MonitoringStatsService,
          useValue: {
            getBoundaries: jest.fn(),
            getAggregate: jest.fn(),
          },
        },
        {
          provide: MonitoringReassignService,
          useValue: {
            reassign: jest.fn(),
          },
        },
        {
          provide: UserLocationsService,
          useValue: { getPermanentLocationIds: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: AreaPlantStatusService,
          useValue: {
            getAreaPlantStatus: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            getEntityHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
    service = module.get(MonitoringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCityStats', () => {
    it('should return city-wide statistics', async () => {
      service.getCityStats.mockResolvedValue(mockCityStats);

      const result = await controller.getCityStats();

      expect(service.getCityStats).toHaveBeenCalled();
      expect(result).toEqual(mockCityStats);
    });

    it('should return statistics with all required fields', async () => {
      service.getCityStats.mockResolvedValue(mockCityStats);

      const result = await controller.getCityStats();

      expect(result).toHaveProperty('total_rayons');
      expect(result).toHaveProperty('total_areas');
      expect(result).toHaveProperty('total_workers');
      expect(result).toHaveProperty('workers_online');
      expect(result).toHaveProperty('workers_offline');
      expect(result).toHaveProperty('active_shifts');
      expect(result).toHaveProperty('tasks_pending');
      expect(result).toHaveProperty('tasks_in_progress');
      expect(result).toHaveProperty('tasks_completed_today');
      expect(result).toHaveProperty('activities_submitted_today');
      expect(result).toHaveProperty('rayons');
      expect(result).toHaveProperty('generated_at');
    });
  });

  describe('getRayonStats', () => {
    it('should return rayon statistics', async () => {
      service.getRayonStats.mockResolvedValue(mockRayonStats);

      const result = await controller.getRayonStats('rayon-1', mockSuperadmin);

      expect(service.getRayonStats).toHaveBeenCalledWith('rayon-1');
      expect(result).toEqual(mockRayonStats);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getRayonStats.mockRejectedValue(
        new NotFoundException('Rayon with ID rayon-1 not found'),
      );

      await expect(controller.getRayonStats('rayon-1', mockSuperadmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow kepala_rayon to access own rayon', async () => {
      service.getRayonStats.mockResolvedValue(mockRayonStats);

      const result = await controller.getRayonStats('rayon-1', mockKepalaRayon);

      expect(service.getRayonStats).toHaveBeenCalledWith('rayon-1');
      expect(result).toEqual(mockRayonStats);
    });

    it('should deny kepala_rayon access to other rayon', async () => {
      await expect(controller.getRayonStats('rayon-other', mockKepalaRayon)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow admin_rayon to access own rayon', async () => {
      service.getRayonStats.mockResolvedValue(mockRayonStats);

      const result = await controller.getRayonStats('rayon-1', mockAdminData);

      expect(service.getRayonStats).toHaveBeenCalledWith('rayon-1');
      expect(result).toEqual(mockRayonStats);
    });

    it('should deny admin_rayon access to other rayon', async () => {
      await expect(controller.getRayonStats('rayon-other', mockAdminData)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return statistics with area summaries', async () => {
      service.getRayonStats.mockResolvedValue(mockRayonStats);

      const result = await controller.getRayonStats('rayon-1', mockSuperadmin);

      expect(result.areas).toBeDefined();
      expect(result.areas.length).toBeGreaterThan(0);
      expect(result.areas[0]).toHaveProperty('id');
      expect(result.areas[0]).toHaveProperty('name');
      expect(result.areas[0]).toHaveProperty('workers_online');
    });

    it('should return statistics with shift summaries', async () => {
      service.getRayonStats.mockResolvedValue(mockRayonStats);

      const result = await controller.getRayonStats('rayon-1', mockSuperadmin);

      expect(result.shifts).toBeDefined();
      expect(result.shifts.length).toBeGreaterThan(0);
      expect(result.shifts[0]).toHaveProperty('id');
      expect(result.shifts[0]).toHaveProperty('name');
      expect(result.shifts[0]).toHaveProperty('is_current');
    });

    it('should return statistics with alerts', async () => {
      service.getRayonStats.mockResolvedValue(mockRayonStats);

      const result = await controller.getRayonStats('rayon-1', mockSuperadmin);

      expect(result.alerts).toBeDefined();
      expect(result.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('getAreaStats', () => {
    it('should return area statistics', async () => {
      service.getAreaStats.mockResolvedValue(mockAreaStats);

      const result = await controller.getAreaStats('area-1', mockSuperadmin);

      expect(service.getAreaStats).toHaveBeenCalledWith('area-1');
      expect(result).toEqual(mockAreaStats);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getAreaStats.mockRejectedValue(
        new NotFoundException('Location with ID area-1 not found'),
      );

      await expect(controller.getAreaStats('area-1', mockSuperadmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow korlap to access own area', async () => {
      service.getAreaStats.mockResolvedValue(mockAreaStats);

      const result = await controller.getAreaStats('area-1', mockKorlap);

      expect(service.getAreaStats).toHaveBeenCalledWith('area-1');
      expect(result).toEqual(mockAreaStats);
    });

    it('should deny korlap access to other area', async () => {
      await expect(controller.getAreaStats('area-other', mockKorlap)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return statistics with worker list', async () => {
      service.getAreaStats.mockResolvedValue(mockAreaStats);

      const result = await controller.getAreaStats('area-1', mockSuperadmin);

      expect(result.users).toBeDefined();
      expect(result.users.length).toBeGreaterThan(0);
      expect(result.users[0]).toHaveProperty('id');
      expect(result.users[0]).toHaveProperty('full_name');
      expect(result.users[0]).toHaveProperty('status');
    });

    it('should return statistics with staff requirements', async () => {
      service.getAreaStats.mockResolvedValue(mockAreaStats);

      const result = await controller.getAreaStats('area-1', mockSuperadmin);

      expect(result.staff_requirements).toBeDefined();
      expect(result.staff_requirements.length).toBeGreaterThan(0);
      expect(result.staff_requirements[0]).toHaveProperty('role');
      expect(result.staff_requirements[0]).toHaveProperty('required_count');
      expect(result.staff_requirements[0]).toHaveProperty('current_count');
      expect(result.staff_requirements[0]).toHaveProperty('is_met');
    });

    it('should return statistics with location data', async () => {
      service.getAreaStats.mockResolvedValue(mockAreaStats);

      const result = await controller.getAreaStats('area-1', mockSuperadmin);

      expect(result.latitude).toBeDefined();
      expect(result.longitude).toBeDefined();
      expect(result.coverage_area).toBeDefined();
    });
  });

  describe('getLiveUsers', () => {
    it('should return live user positions', async () => {
      service.getLiveUsers.mockResolvedValue(mockLiveUsers);

      const result = await controller.getLiveUsers({}, mockSuperadmin);

      expect(service.getLiveUsers).toHaveBeenCalledWith({});
      expect(result).toEqual(mockLiveUsers);
    });

    it('should pass filters to service', async () => {
      const filters: LiveUsersFilterDto = {
        location_id: 'area-1',
        rayon_id: 'rayon-1',
        role: UserRole.SATGAS,
      };
      service.getLiveUsers.mockResolvedValue(mockLiveUsers);

      await controller.getLiveUsers(filters, mockSuperadmin);

      expect(service.getLiveUsers).toHaveBeenCalledWith(filters);
    });

    it('should return user positions with location data', async () => {
      service.getLiveUsers.mockResolvedValue(mockLiveUsers);

      const result = await controller.getLiveUsers({}, mockSuperadmin);

      expect(result.users[0]).toHaveProperty('latitude');
      expect(result.users[0]).toHaveProperty('longitude');
      expect(result.users[0]).toHaveProperty('accuracy');
      expect(result.users[0]).toHaveProperty('battery_level');
      expect(result.users[0]).toHaveProperty('last_update');
    });

    it('should return status counts', async () => {
      service.getLiveUsers.mockResolvedValue(mockLiveUsers);

      const result = await controller.getLiveUsers({}, mockSuperadmin);

      expect(result.total_active).toBeDefined();
      expect(result.total_offline).toBeDefined();
      expect(result.total_absent).toBeDefined();
      expect(result.total_outside_area).toBeDefined();
      // Sum of clocked-in workers (active + offline), not including absent or outside_area
      // (outside_area overlaps active+offline, so don't double-count it)
      expect(result.total_active + result.total_offline).toBe(150);
    });

    it('should return user task information', async () => {
      service.getLiveUsers.mockResolvedValue(mockLiveUsers);

      const result = await controller.getLiveUsers({}, mockSuperadmin);

      expect(result.users[0]).toHaveProperty('current_task_status');
      expect(result.users[0]).toHaveProperty('current_task_title');
    });

    it('should return user shift information', async () => {
      service.getLiveUsers.mockResolvedValue(mockLiveUsers);

      const result = await controller.getLiveUsers({}, mockSuperadmin);

      expect(result.users[0]).toHaveProperty('shift_id');
      expect(result.users[0]).toHaveProperty('shift_name');
      expect(result.users[0]).toHaveProperty('clock_in_time');
    });

    it('should force location_id scope for KORLAP user', async () => {
      service.getLiveUsers.mockResolvedValue(mockLiveUsers);
      const filters: LiveUsersFilterDto = {};

      await controller.getLiveUsers(filters, mockKorlap);

      expect(service.getLiveUsers).toHaveBeenCalledWith(
        expect.objectContaining({ location_id: 'area-1' }),
      );
    });

    it('should force rayon_id scope for ADMIN_RAYON user', async () => {
      service.getLiveUsers.mockResolvedValue(mockLiveUsers);
      const filters: LiveUsersFilterDto = {};

      await controller.getLiveUsers(filters, mockAdminData);

      expect(service.getLiveUsers).toHaveBeenCalledWith(
        expect.objectContaining({ rayon_id: 'rayon-1' }),
      );
    });

    it('should not override explicit rayon_id filter for ADMIN_RAYON', async () => {
      service.getLiveUsers.mockResolvedValue(mockLiveUsers);
      const filters: LiveUsersFilterDto = { rayon_id: 'rayon-1' };

      await controller.getLiveUsers(filters, mockAdminData);

      expect(service.getLiveUsers).toHaveBeenCalledWith(
        expect.objectContaining({ rayon_id: 'rayon-1' }),
      );
    });
  });

  describe('getLocationHistory', () => {
    it('should return location history for a user', async () => {
      const mockHistory = { user_id: 'user-1', points: [], date: '2026-03-04' };
      service.getLocationHistory.mockResolvedValue(mockHistory as any);
      service.getUserDaySummary.mockResolvedValue({
        location_id: 'area-1',
        rayon_id: 'rayon-1',
      } as any);

      const result = await controller.getLocationHistory(
        'user-1',
        { date: '2026-03-04' },
        mockSuperadmin,
      );

      expect(service.getLocationHistory).toHaveBeenCalledWith('user-1', '2026-03-04', undefined);
      expect(result).toEqual(mockHistory);
    });

    it('should deny korlap access to user in different area', async () => {
      service.getUserDaySummary.mockResolvedValue({
        location_id: 'area-other',
        rayon_id: 'rayon-1',
      } as any);

      await expect(
        controller.getLocationHistory('user-2', { date: '2026-03-04' }, mockKorlap),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deny kepala_rayon access to user in different rayon', async () => {
      service.getUserDaySummary.mockResolvedValue({
        location_id: 'area-1',
        rayon_id: 'rayon-other',
      } as any);

      await expect(
        controller.getLocationHistory('user-2', { date: '2026-03-04' }, mockKepalaRayon),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserDaySummary', () => {
    it('should return user day summary', async () => {
      const mockSummary = { user_id: 'user-1', location_id: 'area-1', rayon_id: 'rayon-1' };
      service.getUserDaySummary.mockResolvedValue(mockSummary as any);

      const result = await controller.getUserDaySummary('user-1', mockSuperadmin);

      expect(service.getUserDaySummary).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getBoundaries', () => {
    let statsService: any;

    beforeEach(() => {
      statsService = controller['statsService'];
    });

    it('should return boundaries without filters for superadmin', async () => {
      const mockBoundaries = { rayons: [], generated_at: new Date() };
      statsService.getBoundaries.mockResolvedValue(mockBoundaries);

      const result = await controller.getBoundaries(undefined, mockSuperadmin);

      expect(statsService.getBoundaries).toHaveBeenCalledWith({});
      expect(result).toEqual(mockBoundaries);
    });

    it('should pass rayon_id filter', async () => {
      const mockBoundaries = { rayons: [], generated_at: new Date() };
      statsService.getBoundaries.mockResolvedValue(mockBoundaries);

      await controller.getBoundaries('rayon-1', mockSuperadmin);

      expect(statsService.getBoundaries).toHaveBeenCalledWith({ rayon_id: 'rayon-1' });
    });

    it('should scope korlap to assigned areas only (not full rayon)', async () => {
      const mockBoundaries = { rayons: [], generated_at: new Date() };
      statsService.getBoundaries.mockResolvedValue(mockBoundaries);

      await controller.getBoundaries(undefined, mockKorlap);

      // Korlap can span rayons (e.g. Bungkul lives in Rayon Taman Aktif while
      // home rayon is Pusat). area_ids must include the legacy single area;
      // location_id AND rayon_id must both be dropped so cross-rayon areas show.
      expect(statsService.getBoundaries).toHaveBeenCalledWith(
        expect.objectContaining({ area_ids: ['area-1'] }),
      );
      const call = statsService.getBoundaries.mock.calls[0][0];
      expect(call).not.toHaveProperty('location_id');
      expect(call).not.toHaveProperty('rayon_id');
    });

    it('should scope admin_rayon to own rayon', async () => {
      const mockBoundaries = { rayons: [], generated_at: new Date() };
      statsService.getBoundaries.mockResolvedValue(mockBoundaries);

      await controller.getBoundaries(undefined, mockAdminData);

      expect(statsService.getBoundaries).toHaveBeenCalledWith(
        expect.objectContaining({ rayon_id: 'rayon-1' }),
      );
    });
  });

  describe('getConfig', () => {
    it('should return monitoring configurations', async () => {
      const configService = controller['configService'] as any;
      configService.findAll.mockResolvedValue([
        {
          key: 'status_thresholds',
          value: { active_max_age_seconds: 300 },
          description: 'Thresholds',
          updated_at: new Date(),
        },
      ]);

      const result = await controller.getConfig();

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].key).toBe('status_thresholds');
    });
  });

  describe('updateConfig', () => {
    it('should update a config key', async () => {
      const configService = controller['configService'] as any;
      const now = new Date();
      configService.updateByKey.mockResolvedValue({
        key: 'status_thresholds',
        value: { active_max_age_seconds: 120 },
        updated_at: now,
      });

      const result = await controller.updateConfig('status_thresholds', {
        value: { active_max_age_seconds: 120 },
      });

      expect(result.key).toBe('status_thresholds');
      expect(result.updated_at).toBe(now);
    });
  });

  describe('getStaffingSummary', () => {
    it('should return staffing summary', async () => {
      const mockStaffing = { items: [], generated_at: new Date() };
      service.getStaffingSummary.mockResolvedValue(mockStaffing as any);

      const result = await controller.getStaffingSummary({}, mockSuperadmin);

      expect(service.getStaffingSummary).toHaveBeenCalledWith({});
      expect(result).toEqual(mockStaffing);
    });

    it('should scope korlap filters', async () => {
      service.getStaffingSummary.mockResolvedValue({ items: [], generated_at: new Date() } as any);

      await controller.getStaffingSummary({}, mockKorlap);

      expect(service.getStaffingSummary).toHaveBeenCalledWith(
        expect.objectContaining({ location_id: 'area-1' }),
      );
    });
  });

  describe('getAreaPlantStatus', () => {
    let plantStatusService: any;
    let userAreasService: any;

    beforeEach(() => {
      plantStatusService = controller['areaPlantStatusService'];
      userAreasService = controller['userAreasService'];
    });

    it('should return area plant status for superadmin', async () => {
      const mockStatus = { location_id: 'area-1', overdue: 0 };
      plantStatusService.getAreaPlantStatus.mockResolvedValue(mockStatus);

      const result = await controller.getAreaPlantStatus('area-1', mockSuperadmin);

      expect(plantStatusService.getAreaPlantStatus).toHaveBeenCalledWith('area-1');
      expect(result).toEqual(mockStatus);
    });

    it('should allow korlap to access assigned area', async () => {
      const mockStatus = { location_id: 'area-1', overdue: 0 };
      plantStatusService.getAreaPlantStatus.mockResolvedValue(mockStatus);
      userAreasService.getPermanentLocationIds.mockResolvedValue(['area-1', 'area-9']);

      await controller.getAreaPlantStatus('area-1', mockKorlap);

      expect(plantStatusService.getAreaPlantStatus).toHaveBeenCalledWith('area-1');
    });

    it('should deny korlap access to non-assigned area when they have multi-area assignment', async () => {
      userAreasService.getPermanentLocationIds.mockResolvedValue(['area-9', 'area-10']);

      await expect(controller.getAreaPlantStatus('area-1', mockKorlap)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should deny korlap access to mismatched legacy single area', async () => {
      userAreasService.getPermanentLocationIds.mockResolvedValue([]);

      await expect(controller.getAreaPlantStatus('area-other', mockKorlap)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getAggregate', () => {
    let statsService: any;
    beforeEach(() => {
      statsService = controller['statsService'];
      statsService.getAggregate.mockResolvedValue({ scope: 'city', nodes: [] });
    });

    it('returns city aggregate for city role', async () => {
      await controller.getAggregate(mockSuperadmin, 'city');
      expect(statsService.getAggregate).toHaveBeenCalledWith('city', undefined);
    });

    it('rejects city scope for rayon-scoped role', async () => {
      await expect(controller.getAggregate(mockKepalaRayon, 'city')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('forces rayon-scoped role to own rayon regardless of requested id', async () => {
      await controller.getAggregate(mockKepalaRayon, 'rayon', 'rayon-other');
      expect(statsService.getAggregate).toHaveBeenCalledWith('rayon', 'rayon-1');
    });

    it('lets city role target any rayon', async () => {
      await controller.getAggregate(mockSuperadmin, 'rayon', 'rayon-9');
      expect(statsService.getAggregate).toHaveBeenCalledWith('rayon', 'rayon-9');
    });

    it('region scope forces a rayon-scoped role to its own rayon (5.5c)', async () => {
      await controller.getAggregate(mockKepalaRayon, 'region', 'rayon-other');
      expect(statsService.getAggregate).toHaveBeenCalledWith('region', 'rayon-1');
    });

    it('region scope lets a city role target any rayon', async () => {
      await controller.getAggregate(mockSuperadmin, 'region', 'rayon-9');
      expect(statsService.getAggregate).toHaveBeenCalledWith('region', 'rayon-9');
    });
  });

  describe('getSnapshot', () => {
    it('should return city snapshot for superadmin', async () => {
      const mockSnapshot = { scope: 'city', workers: [] };
      service.getSnapshot.mockResolvedValue(mockSnapshot as any);

      const result = await controller.getSnapshot(mockSuperadmin, 'city');

      expect(service.getSnapshot).toHaveBeenCalledWith('city', undefined);
      expect(result).toEqual(mockSnapshot);
    });

    it('should reject city scope for non-city role', async () => {
      await expect(controller.getSnapshot(mockKepalaRayon, 'city')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should enforce rayon scope for kepala_rayon', async () => {
      service.getSnapshot.mockResolvedValue({ scope: 'rayon' } as any);

      await controller.getSnapshot(mockKepalaRayon, 'rayon', 'rayon-1');

      expect(service.getSnapshot).toHaveBeenCalledWith('rayon', 'rayon-1');
    });

    it('should reject rayon scope for kepala_rayon viewing other rayon', async () => {
      await expect(controller.getSnapshot(mockKepalaRayon, 'rayon', 'rayon-other')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should enforce area scope for korlap', async () => {
      const userAreasService = controller['userAreasService'] as any;
      userAreasService.getPermanentLocationIds.mockResolvedValue(['area-1']);
      service.getSnapshot.mockResolvedValue({ scope: 'area' } as any);

      await controller.getSnapshot(mockKorlap, 'area', 'area-1');

      expect(service.getSnapshot).toHaveBeenCalledWith('area', 'area-1');
    });

    it('should reject area scope for korlap accessing non-assigned area', async () => {
      const userAreasService = controller['userAreasService'] as any;
      userAreasService.getPermanentLocationIds.mockResolvedValue(['area-9']);

      await expect(controller.getSnapshot(mockKorlap, 'area', 'area-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('applyScopeFilters — korlap with assigned areas', () => {
    it('should set area_ids when korlap has multi-area assignment', async () => {
      const userAreasService = controller['userAreasService'] as any;
      userAreasService.getPermanentLocationIds.mockResolvedValue(['area-1', 'area-2']);
      service.getStaffingSummary.mockResolvedValue({ items: [], generated_at: new Date() } as any);

      await controller.getStaffingSummary({}, mockKorlap);

      expect(service.getStaffingSummary).toHaveBeenCalledWith(
        expect.objectContaining({ area_ids: ['area-1', 'area-2'], rayon_id: 'rayon-1' }),
      );
    });
  });

  describe('enforceScopeUser — korlap branches', () => {
    it('should allow korlap when target user has no location_id', async () => {
      service.getUserDaySummary.mockResolvedValue({ location_id: null } as any);
      service.getLocationHistory.mockResolvedValue({ points: [] } as any);

      await controller.getLocationHistory('user-1', { date: '2026-05-24' }, mockKorlap);

      expect(service.getLocationHistory).toHaveBeenCalled();
    });

    it('should allow korlap to view user in assigned multi-area', async () => {
      const userAreasService = controller['userAreasService'] as any;
      userAreasService.getPermanentLocationIds.mockResolvedValue(['area-1', 'area-2']);
      service.getUserDaySummary.mockResolvedValue({ location_id: 'area-2' } as any);
      service.getLocationHistory.mockResolvedValue({ points: [] } as any);

      await controller.getLocationHistory('user-1', { date: '2026-05-24' }, mockKorlap);

      expect(service.getLocationHistory).toHaveBeenCalled();
    });

    it('should deny korlap viewing user outside assigned multi-area set', async () => {
      const userAreasService = controller['userAreasService'] as any;
      userAreasService.getPermanentLocationIds.mockResolvedValue(['area-1', 'area-2']);
      service.getUserDaySummary.mockResolvedValue({ location_id: 'area-9' } as any);

      await expect(
        controller.getLocationHistory('user-1', { date: '2026-05-24' }, mockKorlap),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reassignWorker', () => {
    let reassignService: any;

    beforeEach(() => {
      reassignService = controller['reassignService'];
    });

    it('should reassign worker and return response', async () => {
      const now = new Date();
      const mockResponse = {
        user_id: 'user-1',
        user_name: 'Worker One',
        previous_area_id: 'area-1',
        previous_area_name: 'Taman Bungkul',
        new_area_id: 'area-2',
        new_area_name: 'Taman Pelangi',
        reassigned_at: now,
      };
      reassignService.reassign.mockResolvedValue(mockResponse);

      const dto = { user_id: 'user-1', target_area_id: 'area-2' };
      const result = await controller.reassignWorker(dto, mockSuperadmin);

      expect(reassignService.reassign).toHaveBeenCalledWith(dto, mockSuperadmin);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getReassignmentHistory', () => {
    let auditLogService: any;

    beforeEach(() => {
      auditLogService = controller['auditLogService'];
    });

    it('should return reassignment history for user', async () => {
      const actor: User = {
        ...mockSuperadmin,
        full_name: 'Admin Supervisor',
      };

      const mockLogs = [
        {
          id: 'log-1',
          entity_type: 'user',
          entity_id: 'user-1',
          action: 'reassign',
          actor_id: actor.id,
          actor,
          old_value: { location_id: 'area-1', area_name: 'Taman Bungkul' },
          new_value: { location_id: 'area-2', area_name: 'Taman Sapran' },
          metadata: { reason: 'Rebalancing', effective_date: '2026-06-11', new_schedule_id: null },
          created_at: new Date('2026-06-11T10:30:00Z'),
        },
        {
          id: 'log-2',
          entity_type: 'user',
          entity_id: 'user-1',
          action: 'reassign',
          actor_id: actor.id,
          actor,
          old_value: { location_id: null, area_name: null },
          new_value: { location_id: 'area-1', area_name: 'Taman Bungkul' },
          metadata: { reason: null, effective_date: '2026-06-01', new_schedule_id: null },
          created_at: new Date('2026-06-01T08:00:00Z'),
        },
      ];

      auditLogService.getEntityHistory.mockResolvedValue(mockLogs);
      service.getUserDaySummary.mockResolvedValue({
        location_id: 'area-2',
        rayon_id: 'rayon-1',
      } as any);

      const result = await controller.getReassignmentHistory('user-1', mockSuperadmin);

      expect(auditLogService.getEntityHistory).toHaveBeenCalledWith('user', 'user-1');
      expect(result.user_id).toBe('user-1');
      expect(result.history).toHaveLength(2);
      expect(result.history[0].id).toBe('log-1');
      expect(result.history[0].previous_area_id).toBe('area-1');
      expect(result.history[0].new_area_id).toBe('area-2');
      expect(result.history[0].actor_name).toBe('Admin Supervisor');
    });

    it('should filter to only reassign action logs', async () => {
      const actor: User = mockSuperadmin as any;
      const mixedLogs = [
        {
          id: 'log-1',
          entity_type: 'user',
          entity_id: 'user-1',
          action: 'reassign',
          actor_id: actor.id,
          actor,
          old_value: { location_id: 'area-1', area_name: 'Taman Bungkul' },
          new_value: { location_id: 'area-2', area_name: 'Taman Sapran' },
          metadata: { reason: null, effective_date: '2026-06-11', new_schedule_id: null },
          created_at: new Date('2026-06-11T10:30:00Z'),
        },
        {
          id: 'log-2',
          entity_type: 'user',
          entity_id: 'user-1',
          action: 'update',
          actor_id: actor.id,
          actor,
          old_value: { phone: '081234567890' },
          new_value: { phone: '082345678901' },
          metadata: null,
          created_at: new Date('2026-06-10T08:00:00Z'),
        },
      ];

      auditLogService.getEntityHistory.mockResolvedValue(mixedLogs);
      service.getUserDaySummary.mockResolvedValue({
        location_id: 'area-2',
        rayon_id: 'rayon-1',
      } as any);

      const result = await controller.getReassignmentHistory('user-1', mockSuperadmin);

      expect(result.history).toHaveLength(1);
      expect(result.history[0].id).toBe('log-1');
      expect(result.history[0].new_area_id).toBe('area-2');
    });

    it('should cap history at 20 entries', async () => {
      const actor: User = mockSuperadmin as any;
      const manyLogs = Array.from({ length: 30 }, (_, i) => ({
        id: `log-${i}`,
        entity_type: 'user',
        entity_id: 'user-1',
        action: 'reassign',
        actor_id: actor.id,
        actor,
        old_value: { location_id: 'area-1', area_name: 'Old' },
        new_value: { location_id: 'area-2', area_name: 'New' },
        metadata: { reason: null, effective_date: '2026-06-11', new_schedule_id: null },
        created_at: new Date(),
      }));

      auditLogService.getEntityHistory.mockResolvedValue(manyLogs);
      service.getUserDaySummary.mockResolvedValue({
        location_id: 'area-2',
        rayon_id: 'rayon-1',
      } as any);

      const result = await controller.getReassignmentHistory('user-1', mockSuperadmin);

      expect(result.history).toHaveLength(20);
    });

    it('should handle null metadata fields gracefully', async () => {
      const actor: User = mockSuperadmin as any;
      const logsWithNulls = [
        {
          id: 'log-1',
          entity_type: 'user',
          entity_id: 'user-1',
          action: 'reassign',
          actor_id: actor.id,
          actor,
          old_value: { location_id: 'area-1', area_name: 'Taman Bungkul' },
          new_value: { location_id: 'area-2', area_name: 'Taman Sapran' },
          metadata: null,
          created_at: new Date('2026-06-11T10:30:00Z'),
        },
      ];

      auditLogService.getEntityHistory.mockResolvedValue(logsWithNulls);
      service.getUserDaySummary.mockResolvedValue({
        location_id: 'area-2',
        rayon_id: 'rayon-1',
      } as any);

      const result = await controller.getReassignmentHistory('user-1', mockSuperadmin);

      expect(result.history).toHaveLength(1);
      expect(result.history[0].reason).toBeNull();
      expect(result.history[0].effective_date).toBeNull();
    });

    it('should deny kepala_rayon access to user in different rayon', async () => {
      service.getUserDaySummary.mockResolvedValue({
        location_id: 'area-1',
        rayon_id: 'rayon-other',
      } as any);

      await expect(controller.getReassignmentHistory('user-1', mockKepalaRayon)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle actor with null full_name', async () => {
      const actorWithoutName: User = { ...mockSuperadmin, full_name: null } as any;
      const logsWithMissingActor = [
        {
          id: 'log-1',
          entity_type: 'user',
          entity_id: 'user-1',
          action: 'reassign',
          actor_id: actorWithoutName.id,
          actor: null,
          old_value: { location_id: 'area-1', area_name: 'Taman Bungkul' },
          new_value: { location_id: 'area-2', area_name: 'Taman Sapran' },
          metadata: { reason: null, effective_date: '2026-06-11', new_schedule_id: null },
          created_at: new Date('2026-06-11T10:30:00Z'),
        },
      ];

      auditLogService.getEntityHistory.mockResolvedValue(logsWithMissingActor);
      service.getUserDaySummary.mockResolvedValue({
        location_id: 'area-2',
        rayon_id: 'rayon-1',
      } as any);

      const result = await controller.getReassignmentHistory('user-1', mockSuperadmin);

      expect(result.history[0].actor_name).toBe('Unknown');
    });
  });
});
