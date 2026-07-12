// Mock puppeteer-core BEFORE importing ReportingService
jest.mock('puppeteer-core', () => ({
  launch: jest.fn(),
}));
jest.mock('handlebars');
jest.mock('fs');

import { Test, TestingModule } from '@nestjs/testing';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { ReportTemplate } from './entities/report-template.entity';
import { GeneratedReport } from './entities/generated-report.entity';
import { ReportSchedule } from './entities/report-schedule.entity';
import { ReportType, ReportFormat, GeneratedReportStatus } from './enums/report.enums';
import { User, UserRole } from '../users/entities/user.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

describe('ReportingController', () => {
  let controller: ReportingController;
  let service: any;

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
    parameters: {},
    error_message: null,
    started_at: new Date(),
    completed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSchedule: ReportSchedule = {
    id: 'schedule-1',
    template_id: mockTemplate.id,
    name: 'Daily Report',
    frequency: 'daily',
    cron_expression: '0 6 * * *',
    timezone: 'Asia/Jakarta',
    parameters: {},
    is_active: true,
    last_run_at: null,
    next_run_at: new Date(),
    created_by: mockUser.id,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [
        {
          provide: ReportingService,
          useValue: {
            getTemplates: jest.fn(),
            getTemplate: jest.fn(),
            generateReport: jest.fn(),
            getReports: jest.fn(),
            getReport: jest.fn(),
            deleteReport: jest.fn(),
            getSchedules: jest.fn(),
            createSchedule: jest.fn(),
            getSchedule: jest.fn(),
            updateSchedule: jest.fn(),
            deleteSchedule: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportingController>(ReportingController);
    service = module.get(ReportingService);
  });

  describe('getTemplates', () => {
    it('should return all templates', async () => {
      service.getTemplates.mockResolvedValue([mockTemplate]);

      const result = await controller.getTemplates();

      expect(result).toEqual([mockTemplate]);
      expect(service.getTemplates).toHaveBeenCalled();
    });
  });

  describe('getTemplate', () => {
    it('should return template by slug', async () => {
      service.getTemplate.mockResolvedValue(mockTemplate);

      const result = await controller.getTemplate('daily-operations');

      expect(result).toEqual(mockTemplate);
      expect(service.getTemplate).toHaveBeenCalledWith('daily-operations');
    });
  });

  describe('generateReport', () => {
    it('should queue report generation and return 202', async () => {
      const dto = {
        report_type: ReportType.DAILY_OPERATIONS,
        format: ReportFormat.PDF,
      };

      service.generateReport.mockResolvedValue(mockGeneratedReport);

      const result = await controller.generateReport(dto, mockUser);

      expect(result.status).toBe(GeneratedReportStatus.PROCESSING);
      expect(service.generateReport).toHaveBeenCalledWith(dto, mockUser);
    });
  });

  describe('listReports', () => {
    it('should return paginated reports', async () => {
      const paginatedResult = new PaginatedResponseDto([mockGeneratedReport], 1, 1, 50);
      service.getReports.mockResolvedValue(paginatedResult);

      const result = await controller.listReports({ page: 1, limit: 50 }, mockUser);

      expect(result.data).toHaveLength(1);
      expect(service.getReports).toHaveBeenCalledWith(mockUser, expect.any(Object));
    });
  });

  describe('getReport', () => {
    it('should return a specific report', async () => {
      service.getReport.mockResolvedValue(mockGeneratedReport);

      const result = await controller.getReport('report-1', mockUser);

      expect(result.id).toBe('report-1');
      expect(service.getReport).toHaveBeenCalledWith('report-1', mockUser);
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', async () => {
      service.deleteReport.mockResolvedValue(undefined);

      await controller.deleteReport('report-1', mockUser);

      expect(service.deleteReport).toHaveBeenCalledWith('report-1', mockUser);
    });
  });

  describe('listSchedules', () => {
    it('should return all schedules', async () => {
      service.getSchedules.mockResolvedValue([mockSchedule]);

      const result = await controller.listSchedules(mockUser);

      expect(result).toEqual([mockSchedule]);
      expect(service.getSchedules).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('createSchedule', () => {
    it('should create a schedule', async () => {
      const dto = {
        name: 'Daily Report',
        template_id: mockTemplate.id,
        frequency: 'daily' as const,
        cron_expression: '0 6 * * *',
      };

      service.createSchedule.mockResolvedValue(mockSchedule);

      const result = await controller.createSchedule(dto, mockUser);

      expect(result.name).toBe('Daily Report');
      expect(service.createSchedule).toHaveBeenCalledWith(dto, mockUser);
    });
  });

  describe('getSchedule', () => {
    it('should return a specific schedule', async () => {
      service.getSchedule.mockResolvedValue(mockSchedule);

      const result = await controller.getSchedule('schedule-1', mockUser);

      expect(result.id).toBe('schedule-1');
      expect(service.getSchedule).toHaveBeenCalledWith('schedule-1', mockUser);
    });
  });

  describe('updateSchedule', () => {
    it('should update a schedule', async () => {
      const dto = { name: 'Updated Report' };
      const updated = { ...mockSchedule, name: 'Updated Report' };

      service.updateSchedule.mockResolvedValue(updated);

      const result = await controller.updateSchedule('schedule-1', dto, mockUser);

      expect(result.name).toBe('Updated Report');
      expect(service.updateSchedule).toHaveBeenCalledWith('schedule-1', dto, mockUser);
    });
  });

  describe('deleteSchedule', () => {
    it('should delete a schedule', async () => {
      service.deleteSchedule.mockResolvedValue(undefined);

      await controller.deleteSchedule('schedule-1', mockUser);

      expect(service.deleteSchedule).toHaveBeenCalledWith('schedule-1', mockUser);
    });
  });
});
