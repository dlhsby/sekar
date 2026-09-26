import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditLogService } from './audit.service';
import { AuditChainService } from './audit-chain.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolePermissionsService } from '../rbac/services/role-permissions.service';
import type { User } from '../users/entities/user.entity';
// Registers District as an auditable type (entity_type 'district').
import '../districts/entities/district.entity';

describe('AuditController', () => {
  let module: TestingModule;
  let controller: AuditController;

  const mockAuditLogService = {
    findAllPaginated: jest.fn(),
    getEntityHistory: jest.fn(),
    findForExport: jest.fn(),
    log: jest.fn(),
  };
  const mockChain = { verify: jest.fn() };
  const mockRolePermissions = { getRolePermissionKeys: jest.fn() };
  const korlap = { id: 'k-1', role: 'korlap' } as User;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        { provide: AuditChainService, useValue: mockChain },
        { provide: RolePermissionsService, useValue: mockRolePermissions },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

      const result = await controller.getEntityHistory('task', 'task-uuid-1', korlap);

      expect(result).toEqual(mockLogs);
      expect(mockAuditLogService.getEntityHistory).toHaveBeenCalledWith('task', 'task-uuid-1');
    });

    it('should return empty array if no history', async () => {
      mockAuditLogService.getEntityHistory.mockResolvedValue([]);

      const result = await controller.getEntityHistory('overtime', 'nonexistent-uuid', korlap);

      expect(result).toEqual([]);
    });
  });

  describe('getEntityHistory — master-data diffs', () => {
    it('refuses a role without audit:read for an auditable type', async () => {
      mockRolePermissions.getRolePermissionKeys.mockResolvedValue(['monitoring:read']);
      await expect(controller.getEntityHistory('district', 'd-1', korlap)).rejects.toThrow(
        'audit:read',
      );
      expect(mockAuditLogService.getEntityHistory).not.toHaveBeenCalled();
    });

    it('allows it with audit:read (wildcards honoured)', async () => {
      mockRolePermissions.getRolePermissionKeys.mockResolvedValue(['*:*']);
      mockAuditLogService.getEntityHistory.mockResolvedValue([]);
      await expect(controller.getEntityHistory('district', 'd-1', korlap)).resolves.toEqual([]);
    });

    it('operational types never consult permissions', async () => {
      mockAuditLogService.getEntityHistory.mockResolvedValue([]);
      await controller.getEntityHistory('task', 't-1', korlap);
      expect(mockRolePermissions.getRolePermissionKeys).not.toHaveBeenCalled();
    });
  });

  describe('exportCsv', () => {
    it('audits the export itself and sends CSV', async () => {
      mockAuditLogService.findForExport.mockResolvedValue({ rows: [], truncated: false });
      const res = { setHeader: jest.fn(), send: jest.fn() };
      await controller.exportCsv({ entity_type: 'district' }, res as never);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entity_type: 'audit_log', action: 'export' }),
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('occurred_at_utc'));
    });
  });
});
