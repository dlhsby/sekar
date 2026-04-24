import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditLogService } from './audit.service';

describe('AuditController', () => {
  let module: TestingModule;
  let controller: AuditController;

  const mockAuditLogService = {
    findAllPaginated: jest.fn(),
    getEntityHistory: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAllPaginated with filters', async () => {
      const filters = { entity_type: 'task', page: 1, limit: 10 };
      const mockResult = {
        data: [{ id: 'log-1' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockAuditLogService.findAllPaginated.mockResolvedValue(mockResult);

      const result = await controller.findAll(filters);

      expect(result).toEqual(mockResult);
      expect(mockAuditLogService.findAllPaginated).toHaveBeenCalledWith(filters);
    });

    it('should call service with empty filters', async () => {
      const mockResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
      };
      mockAuditLogService.findAllPaginated.mockResolvedValue(mockResult);

      const result = await controller.findAll({});

      expect(result).toEqual(mockResult);
    });
  });

  describe('getEntityHistory', () => {
    it('should call service.getEntityHistory with entity type and id', async () => {
      const mockLogs = [
        { id: 'log-1', entity_type: 'task', entity_id: 'task-uuid-1', action: 'create' },
      ];
      mockAuditLogService.getEntityHistory.mockResolvedValue(mockLogs);

      const result = await controller.getEntityHistory('task', 'task-uuid-1');

      expect(result).toEqual(mockLogs);
      expect(mockAuditLogService.getEntityHistory).toHaveBeenCalledWith('task', 'task-uuid-1');
    });

    it('should return empty array if no history', async () => {
      mockAuditLogService.getEntityHistory.mockResolvedValue([]);

      const result = await controller.getEntityHistory('overtime', 'nonexistent-uuid');

      expect(result).toEqual([]);
    });
  });
});
