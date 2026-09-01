import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockService: any;

  const mockUser = {
    id: 'user-1',
    full_name: 'Test User',
    role: UserRole.KORLAP,
  } as User;

  beforeEach(async () => {
    mockService = {
      getDashboardSummary: jest.fn().mockResolvedValue({
        today: {
          attendanceRate: 85,
          activeWorkers: 20,
          tasksCompleted: 10,
          activitiesSubmitted: 15,
          openTasks: 5,
          overtimeHours: 2.5,
        },
        trends: {
          attendance: [80, 82, 85, 83, 84, 85, 85],
          taskCompletion: [8, 9, 10, 9, 11, 10, 10],
          activities: [12, 14, 15, 14, 16, 15, 15],
        },
        alerts: {
          understaffedAreas: [],
          overdueMaintenances: 0,
          missingWorkers: 0,
          overdueTasks: 0,
        },
      }),
      listWorkers: jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
      }),
      getWorker: jest.fn().mockResolvedValue({
        id: 'user-1',
        full_name: 'Test User',
        date: '2026-06-16',
        performance_score: 85,
        grade: 'B',
      }),
      listAreas: jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
      }),
      getArea: jest.fn().mockResolvedValue({
        id: 'area-1',
        location_name: 'Taman Utara',
        date: '2026-06-16',
        staffing_coverage: 83.3,
      }),
      getOperational: jest.fn().mockResolvedValue({
        date: '2026-06-16',
        system_attendance: 85.5,
        task_throughput: 42,
        avg_response_hours: 4.2,
        overtime_ratio: 0.08,
        worker_utilization: 92.3,
        geofence_compliance: 94.1,
      }),
      getOperationalTrends: jest.fn().mockResolvedValue([]),
      refreshViews: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  describe('getDashboard', () => {
    it('should call service.getDashboardSummary', async () => {
      await controller.getDashboard(mockUser);

      expect(mockService.getDashboardSummary).toHaveBeenCalledWith(mockUser);
    });

    it('should return dashboard data', async () => {
      const result = await controller.getDashboard(mockUser);

      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('alerts');
    });
  });

  describe('listWorkers', () => {
    it('should call service.listWorkers with user and query', async () => {
      const query = { page: 1, limit: 50 };

      await controller.listWorkers(query as any, mockUser);

      expect(mockService.listWorkers).toHaveBeenCalledWith(mockUser, query);
    });
  });

  describe('getWorker', () => {
    it('should call service.getWorker with id and user', async () => {
      await controller.getWorker('user-1', {}, mockUser);

      expect(mockService.getWorker).toHaveBeenCalledWith('user-1', mockUser, {});
    });
  });

  describe('listAreas', () => {
    it('should call service.listAreas', async () => {
      const query = { page: 1, limit: 50 };

      await controller.listAreas(query as any, mockUser);

      expect(mockService.listAreas).toHaveBeenCalledWith(mockUser, query);
    });
  });

  describe('getArea', () => {
    it('should call service.getArea', async () => {
      await controller.getArea('area-1', {}, mockUser);

      expect(mockService.getArea).toHaveBeenCalledWith('area-1', mockUser, {});
    });
  });

  describe('getOperational', () => {
    it('should call service.getOperational', async () => {
      const query = { date_from: '2026-06-01' };

      await controller.getOperational(query as any);

      expect(mockService.getOperational).toHaveBeenCalledWith(query);
    });
  });

  describe('getOperationalTrends', () => {
    it('should call service.getOperationalTrends', async () => {
      const query = {
        date_from: '2026-06-10',
        date_to: '2026-06-16',
      };

      await controller.getOperationalTrends(query as any);

      expect(mockService.getOperationalTrends).toHaveBeenCalledWith(query);
    });
  });

  describe('refreshViews', () => {
    it('should call service.refreshViews', async () => {
      await controller.refreshViews();

      expect(mockService.refreshViews).toHaveBeenCalled();
    });

    it('should return status', async () => {
      const result = await controller.refreshViews();

      expect(result).toEqual({ status: 'refreshing' });
    });
  });
});
