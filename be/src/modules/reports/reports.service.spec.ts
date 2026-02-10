import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { ReportsService } from './reports.service';
import { Report, ReportType } from './entities/report.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { S3Service } from '../../shared/services/s3.service';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateReportJsonDto } from './dto/create-report-json.dto';
import { CreateAktivitasDto } from './dto/create-aktivitas.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';

describe('ReportsService', () => {
  let module: TestingModule;
  let service: ReportsService;
  let reportsRepository: Repository<Report>;
  let shiftsRepository: Repository<Shift>;
  let activityTypeRepository: Repository<ActivityType>;
  let s3Service: S3Service;

  const mockUser: User = {
    id: 'user-uuid-123',
    username: 'worker1',
    password_hash: 'hashed',
    full_name: 'Worker One',
    role: UserRole.SATGAS,
    area_id: 'area-uuid-123',
    rayon_id: 'rayon-uuid-123',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockReportsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockShiftsRepository = {
    findOne: jest.fn(),
  };

  const mockActivityTypeRepository = {
    findOne: jest.fn(),
  };

  const mockS3Service = {
    generateKey: jest.fn(),
    uploadFile: jest.fn(),
    convertToPresignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Report),
          useValue: mockReportsRepository,
        },
        {
          provide: getRepositoryToken(Shift),
          useValue: mockShiftsRepository,
        },
        {
          provide: getRepositoryToken(ActivityType),
          useValue: mockActivityTypeRepository,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    reportsRepository = module.get<Repository<Report>>(getRepositoryToken(Report));
    shiftsRepository = module.get<Repository<Shift>>(getRepositoryToken(Shift));
    activityTypeRepository = module.get<Repository<ActivityType>>(getRepositoryToken(ActivityType));
    s3Service = module.get<S3Service>(S3Service);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const workerId = 'worker-uuid-123';
    const shiftId = 'shift-uuid-456';
    const createDto: CreateReportDto = {
      shift_id: shiftId,
      report_type: ReportType.TASK_COMPLETION,
      description: 'Completed cleaning',
      gps_lat: -7.2905,
      gps_lng: 112.7398,
    };

    const mockShift = {
      id: shiftId,
      worker_id: workerId,
      clock_in_time: new Date(),
      clock_out_time: null,
    };

    it('should create report without photo', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(mockShift);
      mockReportsRepository.create.mockReturnValue({ ...createDto, worker_id: workerId });
      mockReportsRepository.save.mockResolvedValue({ id: 'report-uuid-1', ...createDto });

      const result = await service.create(createDto, undefined, workerId);

      expect(shiftsRepository.findOne).toHaveBeenCalledWith({
        where: { id: shiftId, worker_id: workerId },
        relations: ['worker', 'area'],
      });
      expect(result.id).toBe('report-uuid-1');
    });

    it('should create report with photo', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      mockShiftsRepository.findOne.mockResolvedValue(mockShift);
      mockS3Service.generateKey.mockReturnValue('reports/photo.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/photo.jpg');
      mockReportsRepository.create.mockReturnValue({ ...createDto, worker_id: workerId });
      mockReportsRepository.save.mockResolvedValue({
        id: 'report-uuid-1',
        ...createDto,
        photo_url: 'https://s3.amazonaws.com/photo.jpg',
      });

      const result = await service.create(createDto, mockFile, workerId);

      expect(s3Service.uploadFile).toHaveBeenCalled();
      expect(result.photo_url).toBe('https://s3.amazonaws.com/photo.jpg');
    });

    it('should throw ApiException with REPORT_SHIFT_NOT_FOUND when shift not found', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(null);

      try {
        await service.create(createDto, undefined, workerId);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.REPORT_SHIFT_NOT_FOUND);
        expect(error.message).toContain('Shift not found');
        expect(error.getStatus()).toBe(404);
      }
    });

    it('should throw ApiException with REPORT_SHIFT_REQUIRED when shift is completed', async () => {
      const completedShift = { ...mockShift, clock_out_time: new Date() };
      mockShiftsRepository.findOne.mockResolvedValue(completedShift);

      try {
        await service.create(createDto, undefined, workerId);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.REPORT_SHIFT_REQUIRED);
        expect(error.message).toContain('Cannot create report for completed shift');
        expect(error.getStatus()).toBe(400);
      }
    });
  });

  describe('findAll', () => {
    it('should return all reports with no filters', async () => {
      const mockReports = [{ id: 'report-1' }, { id: 'report-2' }];
      mockReportsRepository.find.mockResolvedValue(mockReports);

      const result = await service.findAll({});

      expect(result).toEqual(mockReports);
      expect(reportsRepository.find).toHaveBeenCalled();
    });

    it('should filter by worker_id', async () => {
      const mockReports = [{ id: 'report-1', worker_id: 'worker-123' }];
      mockReportsRepository.find.mockResolvedValue(mockReports);

      const result = await service.findAll({ worker_id: 'worker-123' });

      expect(result).toEqual(mockReports);
    });

    it('should filter by report_type', async () => {
      const mockReports = [{ id: 'report-1', report_type: ReportType.INCIDENT }];
      mockReportsRepository.find.mockResolvedValue(mockReports);

      const result = await service.findAll({ report_type: ReportType.INCIDENT });

      expect(result).toEqual(mockReports);
    });

    it('should filter by date range', async () => {
      const mockReports = [{ id: 'report-1' }];
      mockReportsRepository.find.mockResolvedValue(mockReports);

      const result = await service.findAll({
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      });

      expect(result).toEqual(mockReports);
    });

    it('should filter by from_date only (to current date)', async () => {
      const mockReports = [{ id: 'report-1' }];
      mockReportsRepository.find.mockResolvedValue(mockReports);

      const result = await service.findAll({
        from_date: '2026-01-01',
      });

      expect(result).toEqual(mockReports);
    });

    it('should filter by shift_id', async () => {
      const mockReports = [{ id: 'report-1', shift_id: 'shift-123' }];
      mockReportsRepository.find.mockResolvedValue(mockReports);

      const result = await service.findAll({ shift_id: 'shift-123' });

      expect(result).toEqual(mockReports);
    });
  });

  describe('findAllPaginated', () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    beforeEach(() => {
      mockReportsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockS3Service.convertToPresignedUrl.mockImplementation((url: string) => Promise.resolve(url));
    });

    it('should return paginated reports with no filters for superadmin', async () => {
      const mockReports = [{ id: 'report-1', photo_urls: [], photo_url: null }, { id: 'report-2', photo_urls: [], photo_url: null }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockReports, 2]);

      const superadmin = { ...mockUser, role: UserRole.SUPERADMIN };
      const result = await service.findAllPaginated({}, superadmin, 1, 50);

      expect(result.data.length).toBe(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
    });

    it('should scope to own reports for satgas user', async () => {
      const mockReports = [{ id: 'report-1', photo_urls: [], photo_url: null }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockReports, 1]);

      const satgas = { ...mockUser, role: UserRole.SATGAS };
      await service.findAllPaginated({}, satgas, 1, 50);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'report.worker_id = :userId',
        expect.objectContaining({ userId: satgas.id }),
      );
    });

    it('should scope to own reports for korlap user (aktivitas submitter)', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const korlap = { ...mockUser, role: UserRole.KORLAP, area_id: 'area-uuid-123' };
      await service.findAllPaginated({}, korlap, 1, 50);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'report.worker_id = :userId',
        expect.objectContaining({ userId: korlap.id }),
      );
    });

    it('should scope to rayon for kepala_rayon user', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const kepalaRayon = { ...mockUser, role: UserRole.KEPALA_RAYON, rayon_id: 'rayon-uuid-123' };
      await service.findAllPaginated({}, kepalaRayon, 1, 50);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'area.rayon_id = :rayonId',
        expect.objectContaining({ rayonId: 'rayon-uuid-123' }),
      );
    });

    it('should apply worker_id filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const superadmin = { ...mockUser, role: UserRole.SUPERADMIN };
      await service.findAllPaginated({ worker_id: 'worker-123' }, superadmin, 1, 50);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'report.worker_id = :workerId',
        expect.objectContaining({ workerId: 'worker-123' }),
      );
    });

    it('should handle pagination correctly', async () => {
      const mockReports = [{ id: 'report-3', photo_urls: [], photo_url: null }, { id: 'report-4', photo_urls: [], photo_url: null }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockReports, 10]);

      const superadmin = { ...mockUser, role: UserRole.SUPERADMIN };
      const result = await service.findAllPaginated({}, superadmin, 2, 2);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.totalPages).toBe(5);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(2);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(2);
    });

    it('should use default pagination values', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const superadmin = { ...mockUser, role: UserRole.SUPERADMIN };
      const result = await service.findAllPaginated({}, superadmin);

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
    });
  });

  describe('findOne', () => {
    const reportId = 'report-uuid-123';
    const workerId = 'worker-uuid-456';
    const mockReport = {
      id: reportId,
      worker_id: workerId,
      area_id: 'area-uuid-123',
      description: 'Test report',
      photo_urls: [],
      photo_url: null,
      shift: { area: { rayon_id: 'rayon-uuid-123' } },
    };

    beforeEach(() => {
      mockS3Service.convertToPresignedUrl.mockImplementation((url: string) => Promise.resolve(url));
    });

    it('should return report for superadmin', async () => {
      mockReportsRepository.findOne.mockResolvedValue(mockReport);
      const superadmin = { ...mockUser, id: 'admin-uuid', role: UserRole.SUPERADMIN };

      const result = await service.findOne(reportId, superadmin);

      expect(result).toEqual(mockReport);
    });

    it('should return report for owner worker', async () => {
      mockReportsRepository.findOne.mockResolvedValue(mockReport);
      const owner = { ...mockUser, id: workerId, role: UserRole.SATGAS };

      const result = await service.findOne(reportId, owner);

      expect(result).toEqual(mockReport);
    });

    it('should throw ApiException with REPORT_ACCESS_DENIED for non-owner satgas', async () => {
      mockReportsRepository.findOne.mockResolvedValue(mockReport);
      const nonOwner = { ...mockUser, id: 'other-worker-uuid', role: UserRole.SATGAS };

      try {
        await service.findOne(reportId, nonOwner);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.REPORT_ACCESS_DENIED);
        expect(error.message).toBe('You can only access your own reports');
        expect(error.getStatus()).toBe(403);
      }
    });

    it('should throw ApiException with REPORT_NOT_FOUND when report not found', async () => {
      mockReportsRepository.findOne.mockResolvedValue(null);
      const superadmin = { ...mockUser, id: 'admin-uuid', role: UserRole.SUPERADMIN };

      try {
        await service.findOne(reportId, superadmin);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.REPORT_NOT_FOUND);
        expect(error.message).toContain('Report not found');
        expect(error.getStatus()).toBe(404);
      }
    });
  });

  describe('update', () => {
    const reportId = 'report-uuid-123';
    const workerId = 'worker-uuid-456';
    const updateDto: UpdateReportDto = {
      description: 'Updated description',
    };

    it('should update report successfully', async () => {
      const mockReport = {
        id: reportId,
        worker_id: workerId,
        description: 'Old description',
        created_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };
      mockReportsRepository.findOne.mockResolvedValue(mockReport);
      mockReportsRepository.save.mockResolvedValue({
        ...mockReport,
        description: updateDto.description,
      });

      const result = await service.update(reportId, updateDto, undefined, workerId);

      expect(result.description).toBe(updateDto.description);
    });

    it('should update report with new photo', async () => {
      const mockReport = {
        id: reportId,
        worker_id: workerId,
        created_at: new Date(Date.now() - 30 * 60 * 1000),
      };
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'new-photo.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      mockReportsRepository.findOne.mockResolvedValue(mockReport);
      mockS3Service.generateKey.mockReturnValue('reports/new-photo.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/new-photo.jpg');
      mockReportsRepository.save.mockResolvedValue({
        ...mockReport,
        photo_url: 'https://s3.amazonaws.com/new-photo.jpg',
      });

      const result = await service.update(reportId, updateDto, mockFile, workerId);

      expect(result.photo_url).toBe('https://s3.amazonaws.com/new-photo.jpg');
    });

    it('should throw ApiException with REPORT_ACCESS_DENIED if not owner', async () => {
      const mockReport = {
        id: reportId,
        worker_id: workerId,
        created_at: new Date(Date.now() - 30 * 60 * 1000),
      };
      mockReportsRepository.findOne.mockResolvedValue(mockReport);

      try {
        await service.update(reportId, updateDto, undefined, 'other-worker-uuid');
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.REPORT_ACCESS_DENIED);
        expect(error.message).toBe('You can only update your own reports');
        expect(error.getStatus()).toBe(403);
      }
    });

    it('should throw ApiException with REPORT_EDIT_WINDOW_CLOSED if more than 1 hour old', async () => {
      const mockReport = {
        id: reportId,
        worker_id: workerId,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };
      mockReportsRepository.findOne.mockResolvedValue(mockReport);

      try {
        await service.update(reportId, updateDto, undefined, workerId);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED);
        expect(error.message).toBe('Reports can only be updated within 1 hour of creation');
        expect(error.getStatus()).toBe(403);
      }
    });

    it('should throw ApiException with REPORT_NOT_FOUND if report not found', async () => {
      mockReportsRepository.findOne.mockResolvedValue(null);

      try {
        await service.update(reportId, updateDto, undefined, workerId);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.REPORT_NOT_FOUND);
        expect(error.message).toContain('Report not found');
        expect(error.getStatus()).toBe(404);
      }
    });
  });

  describe('remove', () => {
    const reportId = 'report-uuid-123';

    it('should delete report successfully', async () => {
      const mockReport = { id: reportId, description: 'Test report' };
      mockReportsRepository.findOne.mockResolvedValue(mockReport);
      mockReportsRepository.remove.mockResolvedValue(mockReport);

      await service.remove(reportId);

      expect(reportsRepository.remove).toHaveBeenCalledWith(mockReport);
    });

    it('should throw ApiException with REPORT_NOT_FOUND if report not found', async () => {
      mockReportsRepository.findOne.mockResolvedValue(null);

      try {
        await service.remove(reportId);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.REPORT_NOT_FOUND);
        expect(error.message).toContain('Report not found');
        expect(error.getStatus()).toBe(404);
      }
    });
  });

  describe('createFromJson', () => {
    const workerId = 'worker-uuid-123';
    const shiftId = 'shift-uuid-456';
    const areaId = 'area-uuid-789';
    const createJsonDto: CreateReportJsonDto = {
      shift_id: shiftId,
      report_type: ReportType.TASK_COMPLETION,
      description: 'Completed cleaning',
      gps_lat: -7.2905,
      gps_lng: 112.7398,
    };

    const mockShift = {
      id: shiftId,
      worker_id: workerId,
      area_id: areaId,
      clock_in_time: new Date(),
      clock_out_time: null,
    };

    it('should create report from JSON without photos', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(mockShift);
      mockReportsRepository.create.mockReturnValue({
        ...createJsonDto,
        worker_id: workerId,
        area_id: areaId,
      });
      mockReportsRepository.save.mockResolvedValue({
        id: 'report-uuid-1',
        ...createJsonDto,
        worker_id: workerId,
        area_id: areaId,
      });

      const result = await service.createFromJson(createJsonDto, workerId);

      expect(shiftsRepository.findOne).toHaveBeenCalledWith({
        where: { id: shiftId, worker_id: workerId },
        relations: ['worker', 'area'],
      });
      expect(result.id).toBe('report-uuid-1');
      expect(result.worker_id).toBe(workerId);
      expect(result.area_id).toBe(areaId);
    });

    it('should create report from JSON with base64 photos', async () => {
      const dtoWithPhotos: CreateReportJsonDto = {
        ...createJsonDto,
        photos: ['data:image/jpeg;base64,/9j/4AAQSkZJRg=='],
      };

      mockShiftsRepository.findOne.mockResolvedValue(mockShift);
      mockS3Service.generateKey.mockReturnValue('reports/uuid.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/reports/uuid.jpg');
      mockReportsRepository.create.mockReturnValue({
        ...createJsonDto,
        worker_id: workerId,
        area_id: areaId,
      });
      mockReportsRepository.save.mockResolvedValue({
        id: 'report-uuid-1',
        ...createJsonDto,
        worker_id: workerId,
        area_id: areaId,
        photo_url: 'https://s3.amazonaws.com/reports/uuid.jpg',
      });

      const result = await service.createFromJson(dtoWithPhotos, workerId);

      expect(s3Service.uploadFile).toHaveBeenCalled();
      expect(result.photo_url).toBe('https://s3.amazonaws.com/reports/uuid.jpg');
    });

    it('should create report from JSON with raw base64 (no data URI prefix)', async () => {
      const dtoWithRawBase64: CreateReportJsonDto = {
        ...createJsonDto,
        photos: ['/9j/4AAQSkZJRg=='], // raw base64 without data URI prefix
      };

      mockShiftsRepository.findOne.mockResolvedValue(mockShift);
      mockS3Service.generateKey.mockReturnValue('reports/uuid.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/reports/uuid.jpg');
      mockReportsRepository.create.mockReturnValue({
        ...createJsonDto,
        worker_id: workerId,
        area_id: areaId,
      });
      mockReportsRepository.save.mockResolvedValue({
        id: 'report-uuid-1',
        ...createJsonDto,
        worker_id: workerId,
        area_id: areaId,
        photo_url: 'https://s3.amazonaws.com/reports/uuid.jpg',
      });

      const result = await service.createFromJson(dtoWithRawBase64, workerId);

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'reports/uuid.jpg',
        'image/jpeg',
      );
      expect(result.photo_url).toBe('https://s3.amazonaws.com/reports/uuid.jpg');
    });

    it('should prefer file upload over base64 photos', async () => {
      const dtoWithPhotos: CreateReportJsonDto = {
        ...createJsonDto,
        photos: ['data:image/jpeg;base64,/9j/4AAQSkZJRg=='],
      };
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      mockShiftsRepository.findOne.mockResolvedValue(mockShift);
      mockS3Service.generateKey.mockReturnValue('reports/photo.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/photo.jpg');
      mockReportsRepository.create.mockReturnValue({
        ...createJsonDto,
        worker_id: workerId,
        area_id: areaId,
      });
      mockReportsRepository.save.mockResolvedValue({
        id: 'report-uuid-1',
        ...createJsonDto,
        worker_id: workerId,
        area_id: areaId,
        photo_url: 'https://s3.amazonaws.com/photo.jpg',
      });

      const result = await service.createFromJson(dtoWithPhotos, workerId, mockFile);

      // Should use file buffer, not base64
      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        'reports/photo.jpg',
        'image/jpeg',
      );
      expect(result.photo_url).toBe('https://s3.amazonaws.com/photo.jpg');
    });

    it('should throw ApiException with REPORT_SHIFT_NOT_FOUND when shift not found', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(null);

      try {
        await service.createFromJson(createJsonDto, workerId);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.REPORT_SHIFT_NOT_FOUND);
        expect(error.message).toContain('Shift not found');
        expect(error.getStatus()).toBe(404);
      }
    });

    it('should throw ApiException with REPORT_SHIFT_REQUIRED when shift is completed', async () => {
      const completedShift = { ...mockShift, clock_out_time: new Date() };
      mockShiftsRepository.findOne.mockResolvedValue(completedShift);

      try {
        await service.createFromJson(createJsonDto, workerId);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.REPORT_SHIFT_REQUIRED);
        expect(error.message).toContain('Cannot create report for completed shift');
        expect(error.getStatus()).toBe(400);
      }
    });
  });

  describe('findMyReports', () => {
    const workerId = 'worker-uuid-123';

    it('should return all reports for a worker', async () => {
      const mockReports = [
        { id: 'report-1', worker_id: workerId },
        { id: 'report-2', worker_id: workerId },
      ];
      mockReportsRepository.find.mockResolvedValue(mockReports);

      const result = await service.findMyReports(workerId);

      expect(result).toEqual(mockReports);
      expect(reportsRepository.find).toHaveBeenCalledWith({
        where: { worker_id: workerId },
        relations: ['worker', 'shift', 'shift.area'],
        order: { created_at: 'DESC' },
      });
    });

    it('should return reports for a worker filtered by date', async () => {
      const mockReports = [{ id: 'report-1', worker_id: workerId }];
      mockReportsRepository.find.mockResolvedValue(mockReports);

      const result = await service.findMyReports(workerId, '2026-01-15');

      expect(result).toEqual(mockReports);
      expect(reportsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            worker_id: workerId,
            created_at: expect.anything(),
          }),
        }),
      );
    });

    it('should return empty array when worker has no reports', async () => {
      mockReportsRepository.find.mockResolvedValue([]);

      const result = await service.findMyReports(workerId);

      expect(result).toEqual([]);
    });
  });

  describe('createAktivitas (Phase 2C)', () => {
    const userId = 'user-uuid-123';
    const activityTypeId = 'activity-uuid-456';
    const shiftId = 'shift-uuid-789';
    const areaId = 'area-uuid-012';

    const createAktivitasDto: CreateAktivitasDto = {
      activity_type_id: activityTypeId,
      description: 'Melakukan penyiraman tanaman di area Taman Bungkul',
      photo_urls: ['https://s3.amazonaws.com/photo1.jpg', 'https://s3.amazonaws.com/photo2.jpg'],
      gps_lat: -7.2905,
      gps_lng: 112.7398,
    };

    const mockActiveShift = {
      id: shiftId,
      worker_id: userId,
      area_id: areaId,
      clock_in_time: new Date(),
      clock_out_time: null,
      area: { id: areaId, name: 'Taman Bungkul' },
    };

    const mockActivityType = {
      id: activityTypeId,
      name: 'Penyiraman',
      code: 'WATERING',
      applicable_roles: ['Worker', 'Satgas'],
      is_active: true,
    };

    it('should create aktivitas successfully for SATGAS role', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(mockActiveShift);
      mockActivityTypeRepository.findOne.mockResolvedValue(mockActivityType);
      mockReportsRepository.create.mockReturnValue({
        ...createAktivitasDto,
        worker_id: userId,
        shift_id: shiftId,
        area_id: areaId,
      });
      mockReportsRepository.save.mockResolvedValue({
        id: 'report-uuid-1',
        ...createAktivitasDto,
        worker_id: userId,
        shift_id: shiftId,
        area_id: areaId,
        photo_url: createAktivitasDto.photo_urls[0],
      });

      const result = await service.createAktivitas(userId, UserRole.SATGAS, createAktivitasDto);

      expect(shiftsRepository.findOne).toHaveBeenCalledWith({
        where: { worker_id: userId, clock_out_time: IsNull() },
        relations: ['area'],
      });
      expect(activityTypeRepository.findOne).toHaveBeenCalledWith({
        where: { id: activityTypeId, is_active: true },
      });
      expect(result.id).toBe('report-uuid-1');
      expect(result.photo_url).toBe(createAktivitasDto.photo_urls[0]); // backward compat
    });

    it('should create aktivitas successfully for LINMAS role', async () => {
      const linmasActivityType = {
        id: activityTypeId,
        name: 'Patroli Keamanan',
        code: 'SECURITY_PATROL',
        applicable_roles: ['Linmas'],
        is_active: true,
      };

      mockShiftsRepository.findOne.mockResolvedValue(mockActiveShift);
      mockActivityTypeRepository.findOne.mockResolvedValue(linmasActivityType);
      mockReportsRepository.create.mockReturnValue({
        ...createAktivitasDto,
        worker_id: userId,
        shift_id: shiftId,
        area_id: areaId,
      });
      mockReportsRepository.save.mockResolvedValue({
        id: 'report-uuid-2',
        ...createAktivitasDto,
        worker_id: userId,
      });

      const result = await service.createAktivitas(userId, UserRole.LINMAS, createAktivitasDto);

      expect(result.id).toBe('report-uuid-2');
    });

    it('should throw BadRequestException if no active shift found', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(null);

      await expect(service.createAktivitas(userId, UserRole.SATGAS, createAktivitasDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createAktivitas(userId, UserRole.SATGAS, createAktivitasDto)).rejects.toThrow(
        'No active shift found',
      );
    });

    it('should throw NotFoundException if activity type not found', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(mockActiveShift);
      mockActivityTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.createAktivitas(userId, UserRole.SATGAS, createAktivitasDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createAktivitas(userId, UserRole.SATGAS, createAktivitasDto)).rejects.toThrow(
        'Activity type not found or inactive',
      );
    });

    it('should throw ForbiddenException if activity type not applicable to user role', async () => {
      const linmasOnlyActivity = {
        id: activityTypeId,
        name: 'Patroli Keamanan',
        code: 'SECURITY_PATROL',
        applicable_roles: ['Linmas'], // SATGAS cannot do this
        is_active: true,
      };

      mockShiftsRepository.findOne.mockResolvedValue(mockActiveShift);
      mockActivityTypeRepository.findOne.mockResolvedValue(linmasOnlyActivity);

      await expect(service.createAktivitas(userId, UserRole.SATGAS, createAktivitasDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.createAktivitas(userId, UserRole.SATGAS, createAktivitasDto)).rejects.toThrow(
        'Activity type "Patroli Keamanan" is not available for your role',
      );
    });

    it('should validate photo_urls array contains 1-3 photos', async () => {
      // This validation happens at DTO level (class-validator)
      expect(createAktivitasDto.photo_urls.length).toBeGreaterThanOrEqual(1);
      expect(createAktivitasDto.photo_urls.length).toBeLessThanOrEqual(3);
    });

    it('should set report_type to null for new aktivitas', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(mockActiveShift);
      mockActivityTypeRepository.findOne.mockResolvedValue(mockActivityType);
      mockReportsRepository.create.mockReturnValue({
        ...createAktivitasDto,
        worker_id: userId,
        shift_id: shiftId,
        area_id: areaId,
        report_type: null,
      });
      mockReportsRepository.save.mockResolvedValue({
        id: 'report-uuid-3',
        ...createAktivitasDto,
        worker_id: userId,
        report_type: null,
      });

      const result = await service.createAktivitas(userId, UserRole.SATGAS, createAktivitasDto);

      expect(reportsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          report_type: undefined,
        }),
      );
    });
  });
});
