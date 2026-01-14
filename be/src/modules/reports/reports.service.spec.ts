import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Report, ReportType } from './entities/report.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { S3Service } from '../../shared/services/s3.service';
import { UserRole } from '../users/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let reportsRepository: Repository<Report>;
  let shiftsRepository: Repository<Shift>;
  let s3Service: S3Service;

  const mockReportsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockShiftsRepository = {
    findOne: jest.fn(),
  };

  const mockS3Service = {
    generateKey: jest.fn(),
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    reportsRepository = module.get<Repository<Report>>(getRepositoryToken(Report));
    shiftsRepository = module.get<Repository<Shift>>(getRepositoryToken(Shift));
    s3Service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    it('should throw NotFoundException if shift not found', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, undefined, workerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if shift is completed', async () => {
      const completedShift = { ...mockShift, clock_out_time: new Date() };
      mockShiftsRepository.findOne.mockResolvedValue(completedShift);

      await expect(service.create(createDto, undefined, workerId)).rejects.toThrow(
        BadRequestException,
      );
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
  });

  describe('findOne', () => {
    const reportId = 'report-uuid-123';
    const workerId = 'worker-uuid-456';
    const mockReport = {
      id: reportId,
      worker_id: workerId,
      description: 'Test report',
    };

    it('should return report for admin', async () => {
      mockReportsRepository.findOne.mockResolvedValue(mockReport);

      const result = await service.findOne(reportId, 'admin-uuid', UserRole.ADMIN);

      expect(result).toEqual(mockReport);
    });

    it('should return report for supervisor', async () => {
      mockReportsRepository.findOne.mockResolvedValue(mockReport);

      const result = await service.findOne(reportId, 'supervisor-uuid', UserRole.SUPERVISOR);

      expect(result).toEqual(mockReport);
    });

    it('should return report for owner worker', async () => {
      mockReportsRepository.findOne.mockResolvedValue(mockReport);

      const result = await service.findOne(reportId, workerId, UserRole.WORKER);

      expect(result).toEqual(mockReport);
    });

    it('should throw ForbiddenException for non-owner worker', async () => {
      mockReportsRepository.findOne.mockResolvedValue(mockReport);

      await expect(
        service.findOne(reportId, 'other-worker-uuid', UserRole.WORKER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if report not found', async () => {
      mockReportsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(reportId, workerId, UserRole.ADMIN)).rejects.toThrow(
        NotFoundException,
      );
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

    it('should throw ForbiddenException if not owner', async () => {
      const mockReport = {
        id: reportId,
        worker_id: workerId,
        created_at: new Date(Date.now() - 30 * 60 * 1000),
      };
      mockReportsRepository.findOne.mockResolvedValue(mockReport);

      await expect(
        service.update(reportId, updateDto, undefined, 'other-worker-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if more than 1 hour old', async () => {
      const mockReport = {
        id: reportId,
        worker_id: workerId,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };
      mockReportsRepository.findOne.mockResolvedValue(mockReport);

      await expect(
        service.update(reportId, updateDto, undefined, workerId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if report not found', async () => {
      mockReportsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(reportId, updateDto, undefined, workerId),
      ).rejects.toThrow(NotFoundException);
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

    it('should throw NotFoundException if report not found', async () => {
      mockReportsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(reportId)).rejects.toThrow(NotFoundException);
    });
  });
});
