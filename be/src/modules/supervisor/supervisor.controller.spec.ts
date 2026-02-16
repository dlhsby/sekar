import { Test, TestingModule } from '@nestjs/testing';
import { SupervisorController } from './supervisor.controller';
import { SupervisorService } from './supervisor.service';
import { ActiveUsersResponseDto, ActiveUserDto } from './dto/active-users-response.dto';
import { AreaStatusResponseDto, AreaStatusDto } from './dto/area-status-response.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

describe('SupervisorController', () => {
  let module: TestingModule;
  let controller: SupervisorController;
  let service: SupervisorService;

  const mockSupervisorService = {
    getActiveUsers: jest.fn(),
    getActiveUsersPaginated: jest.fn(),
    getAreaStatus: jest.fn(),
    getAttendance: jest.fn(),
    getAttendancePaginated: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [SupervisorController],
      providers: [
        {
          provide: SupervisorService,
          useValue: mockSupervisorService,
        },
      ],
    }).compile();

    controller = module.get<SupervisorController>(SupervisorController);
    service = module.get<SupervisorService>(SupervisorService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getActiveWorkers', () => {
    it('should return paginated active workers', async () => {
      const mockActiveWorker: ActiveUserDto = {
        id: 'worker-uuid-1',
        username: 'worker1',
        full_name: 'Worker One',
        shift: {
          id: 'shift-uuid-1',
          clock_in_time: new Date('2026-01-09T08:00:00Z'),
          area: {
            id: 'area-uuid-1',
            name: 'Taman Bungkul',
          },
        },
        latest_location: {
          gps_lat: -7.2905,
          gps_lng: 112.7398,
          logged_at: new Date('2026-01-09T10:30:00Z'),
        },
      };

      const paginatedResult = new PaginatedResponseDto([mockActiveWorker], 1, 1, 50);

      mockSupervisorService.getActiveUsersPaginated.mockResolvedValue(paginatedResult);

      const paginationDto: PaginationDto = { page: 1, limit: 50 };
      const result = await controller.getActiveUsers(paginationDto);

      expect(service.getActiveUsersPaginated).toHaveBeenCalledWith(1, 50);
      expect(result).toEqual(paginatedResult);
      expect(result.data).toHaveLength(1);
    });

    it('should return empty paginated result if no active workers', async () => {
      const paginatedResult = new PaginatedResponseDto([], 0, 1, 50);

      mockSupervisorService.getActiveUsersPaginated.mockResolvedValue(paginatedResult);

      const paginationDto: PaginationDto = { page: 1, limit: 50 };
      const result = await controller.getActiveUsers(paginationDto);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should work for admin_data role (rayon-scoped access)', async () => {
      const mockActiveWorker: ActiveUserDto = {
        id: 'worker-uuid-1',
        username: 'worker1',
        full_name: 'Worker One',
        shift: {
          id: 'shift-uuid-1',
          clock_in_time: new Date('2026-01-09T08:00:00Z'),
          area: {
            id: 'area-uuid-1',
            name: 'Taman Bungkul',
          },
        },
        latest_location: {
          gps_lat: -7.2905,
          gps_lng: 112.7398,
          logged_at: new Date('2026-01-09T10:30:00Z'),
        },
      };

      const paginatedResult = new PaginatedResponseDto([mockActiveWorker], 1, 1, 50);

      mockSupervisorService.getActiveUsersPaginated.mockResolvedValue(paginatedResult);

      const paginationDto: PaginationDto = { page: 1, limit: 50 };
      const result = await controller.getActiveUsers(paginationDto);

      expect(service.getActiveUsersPaginated).toHaveBeenCalledWith(1, 50);
      expect(result).toEqual(paginatedResult);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getAreaStatus', () => {
    it('should return area status', async () => {
      const mockAreaStatus: AreaStatusDto = {
        id: 'area-uuid-1',
        name: 'Taman Bungkul',
        assigned_workers_count: 3,
        active_workers_count: 2,
      };

      const mockResponse: AreaStatusResponseDto = {
        areas: [mockAreaStatus],
      };

      mockSupervisorService.getAreaStatus.mockResolvedValue(mockResponse);

      const result = await controller.getAreaStatus();

      expect(service.getAreaStatus).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
      expect(result.areas).toHaveLength(1);
      expect(result.areas[0].assigned_workers_count).toBe(3);
      expect(result.areas[0].active_workers_count).toBe(2);
    });

    it('should return empty array if no areas', async () => {
      const mockResponse: AreaStatusResponseDto = {
        areas: [],
      };

      mockSupervisorService.getAreaStatus.mockResolvedValue(mockResponse);

      const result = await controller.getAreaStatus();

      expect(result.areas).toEqual([]);
    });
  });

  describe('getAttendance', () => {
    it('should return attendance report for today by default', async () => {
      const mockResponse: AttendanceResponseDto = {
        date: '2026-01-09',
        total_workers: 10,
        clocked_in_count: 8,
        not_clocked_in: [
          {
            id: 'worker-uuid-1',
            username: 'worker1',
            full_name: 'Worker One',
            area: {
              id: 'area-uuid-1',
              name: 'Taman Bungkul',
            },
          },
          {
            id: 'worker-uuid-2',
            username: 'worker2',
            full_name: 'Worker Two',
            area: null,
          },
        ],
      };

      mockSupervisorService.getAttendancePaginated.mockResolvedValue(mockResponse);

      const result = await controller.getAttendance({});

      expect(service.getAttendancePaginated).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(result).toEqual(mockResponse);
      expect(result.total_workers).toBe(10);
      expect(result.clocked_in_count).toBe(8);
      expect(result.not_clocked_in).toHaveLength(2);
    });

    it('should return attendance report for specific date', async () => {
      const mockResponse: AttendanceResponseDto = {
        date: '2026-01-08',
        total_workers: 10,
        clocked_in_count: 7,
        not_clocked_in: [
          {
            id: 'worker-uuid-1',
            username: 'worker1',
            full_name: 'Worker One',
            area: null,
          },
        ],
      };

      mockSupervisorService.getAttendancePaginated.mockResolvedValue(mockResponse);

      const result = await controller.getAttendance({ date: '2026-01-08' });

      expect(service.getAttendancePaginated).toHaveBeenCalledWith(
        '2026-01-08',
        undefined,
        undefined,
      );
      expect(result.date).toBe('2026-01-08');
      expect(result.clocked_in_count).toBe(7);
    });

    it('should handle 100% attendance', async () => {
      const mockResponse: AttendanceResponseDto = {
        date: '2026-01-09',
        total_workers: 10,
        clocked_in_count: 10,
        not_clocked_in: [],
      };

      mockSupervisorService.getAttendancePaginated.mockResolvedValue(mockResponse);

      const result = await controller.getAttendance({});

      expect(result.not_clocked_in).toHaveLength(0);
    });
  });
});
