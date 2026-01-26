import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report, ReportType } from './entities/report.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { ReportsFilterDto } from './dto/reports-filter.dto';

describe('ReportsController', () => {
  let module: TestingModule;
  let controller: ReportsController;
  let service: ReportsService;

  const mockReportsService = {
    create: jest.fn(),
    createFromJson: jest.fn(),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockWorker: User = {
    id: 'worker-uuid-123',
    username: 'worker1',
    password_hash: 'hashed',
    full_name: 'Worker One',
    role: UserRole.WORKER,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockReport: Report = {
    id: 'report-uuid-1',
    worker_id: mockWorker.id,
    shift_id: 'shift-uuid-1',
    area_id: 'area-uuid-1',
    report_type: ReportType.TASK_COMPLETION,
    description: 'Completed cleaning',
    photo_url: 'https://s3.amazonaws.com/photo.jpg',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    is_reviewed: false,
    created_at: new Date(),
    updated_at: new Date(),
    worker: mockWorker,
    shift: null as any,
    area: null as any,
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createDto: CreateReportDto = {
      shift_id: 'shift-uuid-1',
      report_type: ReportType.TASK_COMPLETION,
      description: 'Completed cleaning',
      gps_lat: -7.2905,
      gps_lng: 112.7398,
    };

    it('should create report without photo', async () => {
      mockReportsService.createFromJson.mockResolvedValue(mockReport);

      const result = await controller.create(createDto, undefined, mockWorker);

      expect(service.createFromJson).toHaveBeenCalledWith(createDto, mockWorker.id, undefined);
      expect(result).toEqual(mockReport);
    });

    it('should create report with photo', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      mockReportsService.createFromJson.mockResolvedValue({
        ...mockReport,
        photo_url: 'https://s3.amazonaws.com/photo.jpg',
      });

      const result = await controller.create(createDto, mockFile, mockWorker);

      expect(service.createFromJson).toHaveBeenCalledWith(createDto, mockWorker.id, mockFile);
      expect(result.photo_url).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated reports with no filters', async () => {
      const paginatedResult = {
        data: [mockReport],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockReportsService.findAllPaginated = jest.fn().mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 1, limit: 50 });

      expect(mockReportsService.findAllPaginated).toHaveBeenCalledWith(
        {
          worker_id: undefined,
          shift_id: undefined,
          report_type: undefined,
          from_date: undefined,
          to_date: undefined,
        },
        1,
        50,
      );
      expect(result).toEqual(paginatedResult);
    });

    it('should return paginated reports filtered by worker_id', async () => {
      const paginatedResult = {
        data: [mockReport],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockReportsService.findAllPaginated = jest.fn().mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 1, limit: 50, worker_id: 'worker-uuid-123' });

      expect(mockReportsService.findAllPaginated).toHaveBeenCalledWith(
        {
          worker_id: 'worker-uuid-123',
          shift_id: undefined,
          report_type: undefined,
          from_date: undefined,
          to_date: undefined,
        },
        1,
        50,
      );
      expect(result).toEqual(paginatedResult);
    });

    it('should return paginated reports filtered by report_type', async () => {
      const paginatedResult = {
        data: [mockReport],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockReportsService.findAllPaginated = jest.fn().mockResolvedValue(paginatedResult);

      const result = await controller.findAll({
        page: 1,
        limit: 50,
        report_type: ReportType.INCIDENT,
      });

      expect(mockReportsService.findAllPaginated).toHaveBeenCalledWith(
        {
          worker_id: undefined,
          shift_id: undefined,
          report_type: ReportType.INCIDENT,
          from_date: undefined,
          to_date: undefined,
        },
        1,
        50,
      );
      expect(result).toEqual(paginatedResult);
    });

    it('should return paginated reports filtered by date range', async () => {
      const paginatedResult = {
        data: [mockReport],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockReportsService.findAllPaginated = jest.fn().mockResolvedValue(paginatedResult);

      const result = await controller.findAll({
        page: 1,
        limit: 50,
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      });

      expect(mockReportsService.findAllPaginated).toHaveBeenCalledWith(
        {
          worker_id: undefined,
          shift_id: undefined,
          report_type: undefined,
          from_date: '2026-01-01',
          to_date: '2026-01-31',
        },
        1,
        50,
      );
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return report by id', async () => {
      mockReportsService.findOne.mockResolvedValue(mockReport);

      const result = await controller.findOne('report-uuid-1', mockWorker);

      expect(service.findOne).toHaveBeenCalledWith('report-uuid-1', mockWorker.id, mockWorker.role);
      expect(result).toEqual(mockReport);
    });
  });

  describe('update', () => {
    const updateDto: UpdateReportDto = {
      description: 'Updated description',
    };

    it('should update report without new photo', async () => {
      const updatedReport = { ...mockReport, description: 'Updated description' };
      mockReportsService.update.mockResolvedValue(updatedReport);

      const result = await controller.update('report-uuid-1', updateDto, undefined, mockWorker);

      expect(service.update).toHaveBeenCalledWith(
        'report-uuid-1',
        updateDto,
        undefined,
        mockWorker.id,
      );
      expect(result.description).toBe('Updated description');
    });

    it('should update report with new photo', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'new-photo.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const updatedReport = { ...mockReport, photo_url: 'https://s3.amazonaws.com/new-photo.jpg' };
      mockReportsService.update.mockResolvedValue(updatedReport);

      const result = await controller.update('report-uuid-1', updateDto, mockFile, mockWorker);

      expect(service.update).toHaveBeenCalledWith(
        'report-uuid-1',
        updateDto,
        mockFile,
        mockWorker.id,
      );
      expect(result.photo_url).toBe('https://s3.amazonaws.com/new-photo.jpg');
    });
  });

  describe('remove', () => {
    it('should delete report', async () => {
      mockReportsService.remove.mockResolvedValue(undefined);

      await controller.remove('report-uuid-1');

      expect(service.remove).toHaveBeenCalledWith('report-uuid-1');
    });
  });
});
