import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { CsvImportService } from './csv/csv-import.service';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { UserRole, User } from '../users/entities/user.entity';
import { KmzUploadResponseDto, KmzConfirmResponseDto } from './dto/kmz-import.dto';

describe('ImportController', () => {
  let controller: ImportController;
  let service: jest.Mocked<ImportService>;
  let csvService: jest.Mocked<CsvImportService>;

  const mockUser: User = {
    id: 'user-1',
    username: 'admin',
    password_hash: 'hashed',
    full_name: 'Admin User',
    phone_number: null,
    profile_picture_url: null,
    role: UserRole.SUPERADMIN,
    is_active: true,
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUploadResponse: KmzUploadResponseDto = {
    session_id: 'session-1',
    total_areas: 2,
    new_areas: 1,
    update_areas: 1,
    areas: [
      {
        name: 'Location 1',
        center: { latitude: -7.29, longitude: 112.74 },
        match_status: 'new',
      },
      {
        name: 'Location 2',
        center: { latitude: -7.3, longitude: 112.75 },
        existing_area_id: 'area-2',
        match_status: 'update',
      },
    ],
    expires_at: new Date(Date.now() + 30 * 60 * 1000),
  };

  const mockConfirmResponse: KmzConfirmResponseDto = {
    total_processed: 2,
    created: 1,
    updated: 1,
    skipped: 0,
    failed: 0,
    results: [
      { name: 'Location 1', action: 'created', location_id: 'new-area-1' },
      { name: 'Location 2', action: 'updated', location_id: 'area-2' },
    ],
  };

  const mockFile = {
    buffer: Buffer.from(''),
    originalname: 'test.kml',
    fieldname: 'file',
    encoding: '7bit',
    mimetype: 'application/vnd.google-earth.kml+xml',
    size: 1000,
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        {
          provide: ImportService,
          useValue: {
            uploadKmz: jest.fn(),
            getPreview: jest.fn(),
            confirmImport: jest.fn(),
          },
        },
        {
          provide: CsvImportService,
          useValue: {
            validate: jest.fn(),
            confirm: jest.fn(),
            getTemplate: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(UserThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ImportController>(ImportController);
    service = module.get(ImportService);
    csvService = module.get(CsvImportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadKmz', () => {
    it('should upload and parse KMZ file', async () => {
      service.uploadKmz.mockResolvedValue(mockUploadResponse);

      const result = await controller.uploadKmz(mockFile, mockUser);

      expect(service.uploadKmz).toHaveBeenCalledWith(mockFile, mockUser.id);
      expect(result).toEqual(mockUploadResponse);
    });

    it('should throw error if no file uploaded', async () => {
      await expect(controller.uploadKmz(null as any, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should pass user id to service', async () => {
      service.uploadKmz.mockResolvedValue(mockUploadResponse);

      await controller.uploadKmz(mockFile, mockUser);

      expect(service.uploadKmz).toHaveBeenCalledWith(mockFile, 'user-1');
    });

    it('should propagate service errors', async () => {
      service.uploadKmz.mockRejectedValue(new BadRequestException('Invalid file'));

      await expect(controller.uploadKmz(mockFile, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPreview', () => {
    it('should return preview for valid session', async () => {
      service.getPreview.mockResolvedValue(mockUploadResponse);

      const result = await controller.getPreview('session-1', mockUser);

      expect(service.getPreview).toHaveBeenCalledWith('session-1', mockUser.id);
      expect(result).toEqual(mockUploadResponse);
    });

    it('should throw error for invalid session', async () => {
      service.getPreview.mockRejectedValue(new NotFoundException('Session not found'));

      await expect(controller.getPreview('invalid-session', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should pass user id for session validation', async () => {
      service.getPreview.mockResolvedValue(mockUploadResponse);

      await controller.getPreview('session-1', mockUser);

      expect(service.getPreview).toHaveBeenCalledWith('session-1', 'user-1');
    });
  });

  describe('confirmImport', () => {
    it('should confirm and execute import', async () => {
      service.confirmImport.mockResolvedValue(mockConfirmResponse);

      const dto = {
        session_id: 'session-1',
        areas: [
          { index: 0, action: 'create' as const },
          { index: 1, action: 'update' as const },
        ],
      };

      const result = await controller.confirmImport(dto, mockUser);

      expect(service.confirmImport).toHaveBeenCalledWith(dto, mockUser.id);
      expect(result).toEqual(mockConfirmResponse);
    });

    it('should throw error for invalid session', async () => {
      service.confirmImport.mockRejectedValue(new NotFoundException('Session not found'));

      const dto = {
        session_id: 'invalid-session',
        areas: [],
      };

      await expect(controller.confirmImport(dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should handle skip action', async () => {
      const skipResponse: KmzConfirmResponseDto = {
        total_processed: 1,
        created: 0,
        updated: 0,
        skipped: 1,
        failed: 0,
        results: [{ name: 'Location 1', action: 'skipped' }],
      };

      service.confirmImport.mockResolvedValue(skipResponse);

      const dto = {
        session_id: 'session-1',
        areas: [{ index: 0, action: 'skip' as const }],
      };

      const result = await controller.confirmImport(dto, mockUser);

      expect(result.skipped).toBe(1);
    });

    it('should handle failed imports', async () => {
      const failedResponse: KmzConfirmResponseDto = {
        total_processed: 1,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        results: [{ name: 'Location 1', action: 'failed', error: 'Database error' }],
      };

      service.confirmImport.mockResolvedValue(failedResponse);

      const dto = {
        session_id: 'session-1',
        areas: [{ index: 0, action: 'create' as const }],
      };

      const result = await controller.confirmImport(dto, mockUser);

      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBe('Database error');
    });

    it('should apply name override and assignments', async () => {
      service.confirmImport.mockResolvedValue(mockConfirmResponse);

      const dto = {
        session_id: 'session-1',
        areas: [
          {
            index: 0,
            action: 'create' as const,
            name_override: 'Custom Name',
            location_type_id: 'type-1',
            district_id: 'district-1',
          },
        ],
      };

      await controller.confirmImport(dto, mockUser);

      expect(service.confirmImport).toHaveBeenCalledWith(dto, mockUser.id);
    });
  });

  describe('Authorization', () => {
    // Note: Actual role guards are tested at integration level
    // These tests verify the controller passes through correctly

    it('should allow admin user to upload', async () => {
      service.uploadKmz.mockResolvedValue(mockUploadResponse);

      const adminUser = { ...mockUser, role: UserRole.SUPERADMIN };
      const result = await controller.uploadKmz(mockFile, adminUser);

      expect(result).toEqual(mockUploadResponse);
    });

    it('should allow admin user to preview', async () => {
      service.getPreview.mockResolvedValue(mockUploadResponse);

      const adminUser = { ...mockUser, role: UserRole.SUPERADMIN };
      const result = await controller.getPreview('session-1', adminUser);

      expect(result).toEqual(mockUploadResponse);
    });

    it('should allow admin user to confirm', async () => {
      service.confirmImport.mockResolvedValue(mockConfirmResponse);

      const adminUser = { ...mockUser, role: UserRole.SUPERADMIN };
      const dto = {
        session_id: 'session-1',
        areas: [{ index: 0, action: 'create' as const }],
      };

      const result = await controller.confirmImport(dto, adminUser);

      expect(result).toEqual(mockConfirmResponse);
    });
  });

  describe('CSV import', () => {
    const csvFile = { ...mockFile, originalname: 'users.csv' } as Express.Multer.File;

    it('validates a users CSV via the service', async () => {
      csvService.validate.mockResolvedValue({ validCount: 2, errors: [], sessionId: 'sess-1' });

      const result = await controller.validateUsersCsv(csvFile, mockUser);

      expect(csvService.validate).toHaveBeenCalledWith('users', csvFile, mockUser.id);
      expect(result.sessionId).toBe('sess-1');
    });

    it('validates an areas CSV via the service', async () => {
      csvService.validate.mockResolvedValue({ validCount: 0, errors: [] });

      await controller.validateAreasCsv(csvFile, mockUser);

      expect(csvService.validate).toHaveBeenCalledWith('areas', csvFile, mockUser.id);
    });

    it('commits a validated session', async () => {
      csvService.confirm.mockResolvedValue({ imported: 5, skipped: 1, skippedReasons: ['x: dup'] });

      const result = await controller.confirmCsv('sess-1', mockUser);

      expect(csvService.confirm).toHaveBeenCalledWith('sess-1', mockUser.id);
      expect(result.imported).toBe(5);
    });

    it('streams a CSV template for a known entity', () => {
      csvService.getTemplate.mockReturnValue({
        filename: 'users-template.csv',
        content: 'username,full_name\r\n',
      });
      const res = { set: jest.fn(), send: jest.fn() } as unknown as Response;

      controller.getTemplate('users', res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': 'attachment; filename="users-template.csv"',
        }),
      );
      expect(res.send).toHaveBeenCalledWith('username,full_name\r\n');
    });

    it('rejects a template request for an unknown entity', () => {
      const res = { set: jest.fn(), send: jest.fn() } as unknown as Response;
      expect(() => controller.getTemplate('tasks', res)).toThrow(BadRequestException);
    });
  });
});
