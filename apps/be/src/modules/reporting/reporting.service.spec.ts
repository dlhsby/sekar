// Mock puppeteer-core BEFORE importing services that use it
jest.mock('puppeteer-core', () => ({
  launch: jest.fn(),
}));

jest.mock('handlebars');
jest.mock('fs');

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { ReportingService } from './reporting.service';
import { ReportTemplate } from './entities/report-template.entity';
import { GeneratedReport } from './entities/generated-report.entity';
import { ReportSchedule } from './entities/report-schedule.entity';
import { ReportType, ReportFormat, GeneratedReportStatus } from './enums/report.enums';
import { User, UserRole } from '../users/entities/user.entity';
import { S3Service } from '../../shared/services/s3.service';
import { AuditLogService } from '../audit/audit.service';
import { PdfGeneratorService } from './generators/pdf.generator';

describe('ReportingService', () => {
  let service: ReportingService;
  let templateRepo: any;
  let generatedReportRepo: any;
  let scheduleRepo: any;
  let reportingQueue: any;
  let s3Service: any;
  let auditLogService: any;

  const mockUser: User = {
    id: 'user-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN_SYSTEM,
    location_id: undefined,
    rayon_id: undefined,
    phone: '081234567890',
    full_name: 'Admin Test',
    password_hash: 'hash',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: undefined,
  } as any;

  const mockTemplate: ReportTemplate = {
    id: 'template-1',
    name: 'Daily Operations',
    slug: 'daily-operations',
    description: 'Test template',
    report_type: ReportType.DAILY_OPERATIONS,
    template_config: {},
    is_system: true,
    created_by: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: getRepositoryToken(ReportTemplate),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GeneratedReport),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ReportSchedule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getQueueToken('reporting'),
          useValue: { add: jest.fn() },
        },
        {
          provide: S3Service,
          useValue: {
            getPresignedUrl: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn() },
        },
        {
          provide: PdfGeneratorService,
          useValue: { generatePdf: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    templateRepo = module.get(getRepositoryToken(ReportTemplate));
    generatedReportRepo = module.get(getRepositoryToken(GeneratedReport));
    scheduleRepo = module.get(getRepositoryToken(ReportSchedule));
    reportingQueue = module.get(getQueueToken('reporting'));
    s3Service = module.get(S3Service);
    auditLogService = module.get(AuditLogService);
  });

  describe('getTemplates', () => {
    it('should return all templates', async () => {
      templateRepo.find.mockResolvedValue([mockTemplate]);

      const result = await service.getTemplates();

      expect(result).toEqual([mockTemplate]);
      expect(templateRepo.find).toHaveBeenCalled();
    });
  });

  describe('getTemplate', () => {
    it('should return template by slug', async () => {
      templateRepo.findOne.mockResolvedValue(mockTemplate);

      const result = await service.getTemplate('daily-operations');

      expect(result).toEqual(mockTemplate);
      expect(templateRepo.findOne).toHaveBeenCalledWith({
        where: { slug: 'daily-operations' },
      });
    });

    it('should throw NotFoundException if template not found', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await expect(service.getTemplate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateReport', () => {
    it('should create and queue a report generation', async () => {
      const dto = {
        report_type: ReportType.DAILY_OPERATIONS,
        format: ReportFormat.PDF,
        parameters: { start_date: '2026-01-01' },
      };

      const mockGeneratedReport: GeneratedReport = {
        id: 'report-1',
        template_id: mockTemplate.id,
        generated_by: mockUser.id,
        schedule_id: null,
        title: 'Test Report',
        report_type: ReportType.DAILY_OPERATIONS,
        format: ReportFormat.PDF,
        status: GeneratedReportStatus.PROCESSING,
        file_url: null,
        file_size_bytes: null,
        parameters: dto.parameters,
        error_message: null,
        started_at: new Date(),
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      templateRepo.findOne.mockResolvedValue(mockTemplate);
      generatedReportRepo.create.mockReturnValue(mockGeneratedReport);
      generatedReportRepo.save.mockResolvedValue(mockGeneratedReport);
      reportingQueue.add.mockResolvedValue({});

      const result = await service.generateReport(dto, mockUser);

      expect(result.status).toBe(GeneratedReportStatus.PROCESSING);
      expect(reportingQueue.add).toHaveBeenCalledWith(
        'generate-report',
        expect.objectContaining({
          reportId: 'report-1',
          templateId: mockTemplate.id,
          format: ReportFormat.PDF,
        }),
        expect.any(Object),
      );
      expect(auditLogService.log).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user lacks permissions', async () => {
      const forbiddenUser = { ...mockUser, role: UserRole.SATGAS };

      await expect(
        service.generateReport(
          {
            report_type: ReportType.DAILY_OPERATIONS,
            format: ReportFormat.PDF,
          },
          forbiddenUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteReport', () => {
    it('should delete report and S3 file', async () => {
      const mockReport: GeneratedReport = {
        id: 'report-1',
        template_id: mockTemplate.id,
        generated_by: mockUser.id,
        schedule_id: null,
        title: 'Test Report',
        report_type: ReportType.DAILY_OPERATIONS,
        format: ReportFormat.PDF,
        status: GeneratedReportStatus.COMPLETED,
        file_url: 'reports/report-1.pdf',
        file_size_bytes: 1024,
        parameters: {},
        error_message: null,
        started_at: new Date(),
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      generatedReportRepo.findOne.mockResolvedValue(mockReport);
      generatedReportRepo.remove.mockResolvedValue(mockReport);
      s3Service.deleteFile.mockResolvedValue(undefined);

      await service.deleteReport('report-1', mockUser);

      expect(s3Service.deleteFile).toHaveBeenCalledWith('reports/report-1.pdf');
      expect(generatedReportRepo.remove).toHaveBeenCalledWith(mockReport);
      expect(auditLogService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if report not found', async () => {
      generatedReportRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteReport('non-existent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createSchedule', () => {
    it('should create a schedule for admin', async () => {
      const dto = {
        name: 'Daily Report',
        template_id: mockTemplate.id,
        frequency: 'daily' as const,
        cron_expression: '0 6 * * *',
      };

      const mockSchedule: ReportSchedule = {
        id: 'schedule-1',
        template_id: mockTemplate.id,
        name: dto.name,
        frequency: dto.frequency,
        cron_expression: dto.cron_expression,
        timezone: 'Asia/Jakarta',
        parameters: {},
        is_active: true,
        last_run_at: null,
        next_run_at: new Date(),
        created_by: mockUser.id,
        created_at: new Date(),
        updated_at: new Date(),
      };

      templateRepo.findOne.mockResolvedValue(mockTemplate);
      scheduleRepo.create.mockReturnValue(mockSchedule);
      scheduleRepo.save.mockResolvedValue(mockSchedule);

      const result = await service.createSchedule(dto, mockUser);

      expect(result.name).toBe(dto.name);
      expect(scheduleRepo.save).toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      const forbiddenUser = { ...mockUser, role: UserRole.KEPALA_RAYON };

      await expect(
        service.createSchedule(
          {
            name: 'Test',
            template_id: mockTemplate.id,
            frequency: 'daily',
            cron_expression: '0 6 * * *',
          },
          forbiddenUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteOldReports', () => {
    it('should delete reports older than retention days', async () => {
      const oldReport: GeneratedReport = {
        id: 'old-report',
        template_id: mockTemplate.id,
        generated_by: mockUser.id,
        schedule_id: null,
        title: 'Old Report',
        report_type: ReportType.DAILY_OPERATIONS,
        format: ReportFormat.PDF,
        status: GeneratedReportStatus.COMPLETED,
        file_url: 'reports/old.pdf',
        file_size_bytes: 1024,
        parameters: {},
        error_message: null,
        started_at: new Date(),
        completed_at: new Date(),
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      };

      generatedReportRepo.find.mockResolvedValue([oldReport]);
      s3Service.deleteFile.mockResolvedValue(undefined);
      generatedReportRepo.remove.mockResolvedValue(oldReport);

      const result = await service.deleteOldReports(90);

      expect(result).toBe(1);
      expect(s3Service.deleteFile).toHaveBeenCalledWith('reports/old.pdf');
      expect(generatedReportRepo.remove).toHaveBeenCalledWith(oldReport);
    });
  });
});
