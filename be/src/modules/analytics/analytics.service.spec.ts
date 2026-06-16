import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { PerformanceScoreService } from './services/performance-score.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { RedisService } from '../../common/services/redis.service';
import { WorkerAnalyticsQueryDto } from './dto/worker-analytics-query.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockDataSource: any;
  let mockUserRepo: any;
  let mockAreaRepo: any;
  let mockRayonRepo: any;
  let mockRedis: any;
  let mockPerformanceScoreService: any;

  const mockUser = {
    id: 'user-1',
    full_name: 'Test User',
    role: UserRole.KORLAP,
    area_id: 'area-1',
    rayon_id: null,
  } as unknown as User;

  const mockArea = {
    id: 'area-1',
    name: 'Taman Utara',
    rayon_id: 'rayon-1',
    deleted_at: null,
  } as unknown as Area;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn().mockResolvedValue([]),
      createQueryRunner: jest.fn(),
    };

    mockUserRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      }),
      findOne: jest.fn().mockResolvedValue(mockUser),
    };

    mockAreaRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockArea], 1]),
      }),
      findOne: jest.fn().mockResolvedValue(mockArea),
    };

    mockRayonRepo = {
      findOne: jest.fn(),
    };

    mockRedis = {
      getClient: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        keys: jest.fn().mockResolvedValue([]),
        del: jest.fn().mockResolvedValue(0),
      }),
    };

    mockPerformanceScoreService = {
      calculateScore: jest.fn().mockReturnValue(85),
      getGrade: jest.fn().mockReturnValue('B'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Area),
          useValue: mockAreaRepo,
        },
        {
          provide: getRepositoryToken(Rayon),
          useValue: mockRayonRepo,
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
        {
          provide: PerformanceScoreService,
          useValue: mockPerformanceScoreService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getDashboardSummary', () => {
    it('should return dashboard summary', async () => {
      mockDataSource.query.mockResolvedValue([
        {
          total_attended: 20,
          total_scheduled: 25,
          tasks_completed: 10,
          avg_task_duration_hours: 4.5,
          overtime_total_hours: 5,
        },
      ]);

      const result = await service.getDashboardSummary(mockUser);

      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('alerts');
    });

    it('should cache dashboard results', async () => {
      mockDataSource.query.mockResolvedValue([]);
      const getClientMock = mockRedis.getClient();

      await service.getDashboardSummary(mockUser);
      await service.getDashboardSummary(mockUser);

      expect(getClientMock.set).toHaveBeenCalled();
    });
  });

  describe('listWorkers', () => {
    it('should return paginated workers', async () => {
      const query = { page: 1, limit: 50 } as WorkerAnalyticsQueryDto;

      const result = await service.listWorkers(mockUser, query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta.page).toBe(1);
    });
  });

  describe('getWorker', () => {
    it('should return worker analytics', async () => {
      mockDataSource.query.mockResolvedValue([
        {
          attended: 20,
          late_minutes: 5,
          total_tasks: 15,
          completed_tasks: 14,
          total_activities: 18,
          approved_activities: 17,
          within_area_pings: 450,
          total_pings: 480,
          overtime_hours: 12.5,
        },
      ]);

      const result = await service.getWorker('user-1', mockUser, {});

      expect(result).toHaveProperty('performance_score');
      expect(result).toHaveProperty('grade');
    });

    it('should prevent non-admin from accessing others data', async () => {
      const satgasUser = { ...mockUser, role: UserRole.SATGAS };

      expect(() => service.getWorker('other-user-id', satgasUser as User, {})).rejects.toThrow();
    });
  });

  describe('getArea', () => {
    it('should return area analytics', async () => {
      mockDataSource.query.mockResolvedValue([
        {
          attended_workers: 5,
          required_workers: 6,
          open_tasks_count: 8,
          maintenance_count: 2,
          outside_area_events: 0,
          missing_events: 0,
        },
      ]);

      const result = await service.getArea('area-1', mockUser, {});

      expect(result).toHaveProperty('staffing_coverage');
    });
  });

  describe('refreshViews', () => {
    it('should refresh materialized views', async () => {
      const queryRunnerMock = {
        query: jest.fn().mockResolvedValue(null),
        release: jest.fn(),
      };
      mockDataSource.createQueryRunner.mockReturnValue(queryRunnerMock);

      await service.refreshViews();

      expect(queryRunnerMock.query).toHaveBeenCalledWith(
        expect.stringContaining('REFRESH MATERIALIZED VIEW CONCURRENTLY'),
      );
    });

    it('should clear analytics cache after refresh', async () => {
      const queryRunnerMock = {
        query: jest.fn().mockResolvedValue(null),
        release: jest.fn(),
      };
      mockDataSource.createQueryRunner.mockReturnValue(queryRunnerMock);
      const getClientMock = mockRedis.getClient();
      getClientMock.keys.mockResolvedValue(['analytics:test']);

      await service.refreshViews();

      expect(getClientMock.del).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      mockDataSource.createQueryRunner.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(service.refreshViews()).resolves.not.toThrow();
    });
  });

  describe('getOperational', () => {
    it('should return operational analytics', async () => {
      mockDataSource.query.mockResolvedValue([
        {
          total_attended: 20,
          total_scheduled: 25,
          tasks_completed: 10,
          avg_task_duration_hours: 4.5,
          overtime_total_hours: 5,
        },
      ]);

      const result = await service.getOperational({});

      expect(result).toHaveProperty('system_attendance');
      expect(result).toHaveProperty('task_throughput');
    });
  });

  describe('getOperationalTrends', () => {
    it('should return trend series', async () => {
      mockDataSource.query.mockResolvedValue([
        {
          total_attended: 20,
          total_scheduled: 25,
          tasks_completed: 10,
          avg_task_duration_hours: 4.5,
          overtime_total_hours: 5,
        },
      ]);

      const result = await service.getOperationalTrends({
        date_from: '2026-06-10',
        date_to: '2026-06-16',
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
