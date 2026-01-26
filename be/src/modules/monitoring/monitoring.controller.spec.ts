import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { CityStatsDto } from './dto/city-stats.dto';
import { RayonStatsDto } from './dto/rayon-stats.dto';
import { AreaStatsDto } from './dto/area-stats.dto';
import { LiveWorkersResponseDto, LiveWorkersFilterDto } from './dto/live-workers.dto';
import { UserRole } from '../users/entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let service: jest.Mocked<MonitoringService>;

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
    reports_submitted_today: 100,
    rayons: [
      {
        id: 'rayon-1',
        name: 'Rayon Selatan',
        code: 'SELATAN',
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
    code: 'SELATAN',
    total_areas: 10,
    total_workers: 30,
    workers_online: 25,
    workers_offline: 5,
    active_shifts: 25,
    tasks_pending: 5,
    tasks_in_progress: 10,
    tasks_completed_today: 8,
    reports_submitted_today: 20,
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
    total_workers_assigned: 6,
    workers_online: 5,
    workers_offline: 1,
    is_fully_staffed: false,
    staff_requirements: [
      {
        id: 'req-1',
        role: UserRole.WORKER,
        required_count: 6,
        current_count: 5,
        delta: -1,
        is_met: false,
      },
    ],
    workers: [
      {
        id: 'user-1',
        full_name: 'Worker One',
        role: UserRole.WORKER,
        is_online: true,
        last_lat: -7.2905,
        last_lng: 112.7398,
        last_location_update: new Date(),
        is_within_area: true,
        current_shift_id: 'shift-1',
        clock_in_time: new Date(),
      },
    ],
    tasks_total: 10,
    tasks_pending: 3,
    tasks_in_progress: 4,
    tasks_completed_today: 3,
    active_tasks: [],
    reports_submitted_today: 15,
    alerts: ['Understaffed: need 1 more Worker'],
    generated_at: new Date(),
  };

  const mockLiveWorkers: LiveWorkersResponseDto = {
    total_online: 150,
    total_offline: 50,
    workers: [
      {
        id: 'user-1',
        full_name: 'Worker One',
        role: UserRole.WORKER,
        area_id: 'area-1',
        area_name: 'Taman Bungkul',
        rayon_id: 'rayon-1',
        rayon_name: 'Rayon Selatan',
        latitude: -7.2905,
        longitude: 112.7398,
        accuracy: 10,
        battery_level: 85,
        last_update: new Date(),
        is_within_area: true,
        shift_id: 'shift-1',
        shift_name: 'Shift 1',
        clock_in_time: new Date(),
        current_task_status: null,
        current_task_title: null,
      },
    ],
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
            getLiveWorkers: jest.fn(),
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
      expect(result).toHaveProperty('reports_submitted_today');
      expect(result).toHaveProperty('rayons');
      expect(result).toHaveProperty('generated_at');
    });
  });

  describe('getRayonStats', () => {
    it('should return rayon statistics', async () => {
      service.getRayonStats.mockResolvedValue(mockRayonStats);

      const result = await controller.getRayonStats('rayon-1');

      expect(service.getRayonStats).toHaveBeenCalledWith('rayon-1');
      expect(result).toEqual(mockRayonStats);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getRayonStats.mockRejectedValue(
        new NotFoundException('Rayon with ID rayon-1 not found'),
      );

      await expect(controller.getRayonStats('rayon-1')).rejects.toThrow(NotFoundException);
    });

    it('should return statistics with area summaries', async () => {
      service.getRayonStats.mockResolvedValue(mockRayonStats);

      const result = await controller.getRayonStats('rayon-1');

      expect(result.areas).toBeDefined();
      expect(result.areas.length).toBeGreaterThan(0);
      expect(result.areas[0]).toHaveProperty('id');
      expect(result.areas[0]).toHaveProperty('name');
      expect(result.areas[0]).toHaveProperty('workers_online');
    });

    it('should return statistics with shift summaries', async () => {
      service.getRayonStats.mockResolvedValue(mockRayonStats);

      const result = await controller.getRayonStats('rayon-1');

      expect(result.shifts).toBeDefined();
      expect(result.shifts.length).toBeGreaterThan(0);
      expect(result.shifts[0]).toHaveProperty('id');
      expect(result.shifts[0]).toHaveProperty('name');
      expect(result.shifts[0]).toHaveProperty('is_current');
    });

    it('should return statistics with alerts', async () => {
      service.getRayonStats.mockResolvedValue(mockRayonStats);

      const result = await controller.getRayonStats('rayon-1');

      expect(result.alerts).toBeDefined();
      expect(result.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('getAreaStats', () => {
    it('should return area statistics', async () => {
      service.getAreaStats.mockResolvedValue(mockAreaStats);

      const result = await controller.getAreaStats('area-1');

      expect(service.getAreaStats).toHaveBeenCalledWith('area-1');
      expect(result).toEqual(mockAreaStats);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getAreaStats.mockRejectedValue(
        new NotFoundException('Area with ID area-1 not found'),
      );

      await expect(controller.getAreaStats('area-1')).rejects.toThrow(NotFoundException);
    });

    it('should return statistics with worker list', async () => {
      service.getAreaStats.mockResolvedValue(mockAreaStats);

      const result = await controller.getAreaStats('area-1');

      expect(result.workers).toBeDefined();
      expect(result.workers.length).toBeGreaterThan(0);
      expect(result.workers[0]).toHaveProperty('id');
      expect(result.workers[0]).toHaveProperty('full_name');
      expect(result.workers[0]).toHaveProperty('is_online');
    });

    it('should return statistics with staff requirements', async () => {
      service.getAreaStats.mockResolvedValue(mockAreaStats);

      const result = await controller.getAreaStats('area-1');

      expect(result.staff_requirements).toBeDefined();
      expect(result.staff_requirements.length).toBeGreaterThan(0);
      expect(result.staff_requirements[0]).toHaveProperty('role');
      expect(result.staff_requirements[0]).toHaveProperty('required_count');
      expect(result.staff_requirements[0]).toHaveProperty('current_count');
      expect(result.staff_requirements[0]).toHaveProperty('is_met');
    });

    it('should return statistics with location data', async () => {
      service.getAreaStats.mockResolvedValue(mockAreaStats);

      const result = await controller.getAreaStats('area-1');

      expect(result.latitude).toBeDefined();
      expect(result.longitude).toBeDefined();
      expect(result.coverage_area).toBeDefined();
    });
  });

  describe('getLiveWorkers', () => {
    it('should return live worker positions', async () => {
      service.getLiveWorkers.mockResolvedValue(mockLiveWorkers);

      const result = await controller.getLiveWorkers({});

      expect(service.getLiveWorkers).toHaveBeenCalledWith({});
      expect(result).toEqual(mockLiveWorkers);
    });

    it('should pass filters to service', async () => {
      const filters: LiveWorkersFilterDto = {
        area_id: 'area-1',
        rayon_id: 'rayon-1',
        role: UserRole.WORKER,
      };
      service.getLiveWorkers.mockResolvedValue(mockLiveWorkers);

      await controller.getLiveWorkers(filters);

      expect(service.getLiveWorkers).toHaveBeenCalledWith(filters);
    });

    it('should return worker positions with location data', async () => {
      service.getLiveWorkers.mockResolvedValue(mockLiveWorkers);

      const result = await controller.getLiveWorkers({});

      expect(result.workers[0]).toHaveProperty('latitude');
      expect(result.workers[0]).toHaveProperty('longitude');
      expect(result.workers[0]).toHaveProperty('accuracy');
      expect(result.workers[0]).toHaveProperty('battery_level');
      expect(result.workers[0]).toHaveProperty('last_update');
    });

    it('should return online/offline counts', async () => {
      service.getLiveWorkers.mockResolvedValue(mockLiveWorkers);

      const result = await controller.getLiveWorkers({});

      expect(result.total_online).toBeDefined();
      expect(result.total_offline).toBeDefined();
      expect(result.total_online + result.total_offline).toBe(200);
    });

    it('should return worker task information', async () => {
      service.getLiveWorkers.mockResolvedValue(mockLiveWorkers);

      const result = await controller.getLiveWorkers({});

      expect(result.workers[0]).toHaveProperty('current_task_status');
      expect(result.workers[0]).toHaveProperty('current_task_title');
    });

    it('should return worker shift information', async () => {
      service.getLiveWorkers.mockResolvedValue(mockLiveWorkers);

      const result = await controller.getLiveWorkers({});

      expect(result.workers[0]).toHaveProperty('shift_id');
      expect(result.workers[0]).toHaveProperty('shift_name');
      expect(result.workers[0]).toHaveProperty('clock_in_time');
    });
  });
});
