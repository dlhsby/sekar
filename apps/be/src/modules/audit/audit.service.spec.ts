import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { auditContext } from '../../common/context/audit-context';

describe('AuditLogService', () => {
  let module: TestingModule;
  let service: AuditLogService;

  const mockAuditLogRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const createMockQueryBuilder = (result: any[] = [], total = 0) => ({
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
    getManyAndCount: jest.fn().mockResolvedValue([result, total]),
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepo,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save audit log entry', async () => {
      const params = {
        entity_type: 'task',
        entity_id: 'task-uuid-1',
        action: 'create',
        actor_id: 'user-uuid-1',
        old_value: null,
        new_value: { status: 'pending' },
        metadata: { ip: '127.0.0.1' },
      };

      const mockEntry = { id: 'audit-uuid-1', ...params, created_at: new Date() };
      mockAuditLogRepo.create.mockReturnValue(mockEntry);
      mockAuditLogRepo.save.mockResolvedValue(mockEntry);

      const result = await service.log(params);

      expect(result).toEqual(mockEntry);
      expect(mockAuditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'task',
          entity_id: 'task-uuid-1',
          action: 'create',
          actor_id: 'user-uuid-1',
          old_value: null,
          new_value: { status: 'pending' },
          metadata: { ip: '127.0.0.1' },
          outcome: 'success',
          source: 'api',
        }),
      );
      expect(mockAuditLogRepo.save).toHaveBeenCalledWith(mockEntry);
    });

    it('should handle optional null values', async () => {
      const params = {
        entity_type: 'shift',
        entity_id: 'shift-uuid-1',
        action: 'clock_in',
        actor_id: 'user-uuid-1',
      };

      const mockEntry = {
        id: 'audit-uuid-2',
        ...params,
        old_value: null,
        new_value: null,
        metadata: null,
        created_at: new Date(),
      };
      mockAuditLogRepo.create.mockReturnValue(mockEntry);
      mockAuditLogRepo.save.mockResolvedValue(mockEntry);

      const result = await service.log(params);

      expect(result).toEqual(mockEntry);
      expect(mockAuditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          old_value: null,
          new_value: null,
          metadata: null,
        }),
      );
    });
  });

  describe('getEntityHistory', () => {
    it('should find audit logs by entity type and id', async () => {
      const mockLogs = [
        { id: 'log-1', entity_type: 'task', entity_id: 'task-1', action: 'create' },
        { id: 'log-2', entity_type: 'task', entity_id: 'task-1', action: 'assign' },
      ];
      const qb = createMockQueryBuilder(mockLogs);
      mockAuditLogRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getEntityHistory('task', 'task-1');

      expect(result).toEqual(mockLogs);
      expect(qb.where).toHaveBeenCalledWith('audit.entity_type = :entityType', {
        entityType: 'task',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('audit.entity_id = :entityId', {
        entityId: 'task-1',
      });
      // Only the actor's id/name/role — never contact details.
      expect(qb.addSelect).toHaveBeenCalledWith(['actor.id', 'actor.full_name', 'actor.role']);
    });

    it('should return empty array if no logs found', async () => {
      mockAuditLogRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]));

      const result = await service.getEntityHistory('task', 'nonexistent-id');

      expect(result).toEqual([]);
    });
  });

  describe('getActorHistory', () => {
    it('should find audit logs by actor id with limit 100', async () => {
      const mockLogs = [{ id: 'log-1', actor_id: 'user-1', action: 'create' }];
      mockAuditLogRepo.find.mockResolvedValue(mockLogs);

      const result = await service.getActorHistory('user-1');

      expect(result).toEqual(mockLogs);
      expect(mockAuditLogRepo.find).toHaveBeenCalledWith({
        where: { actor_id: 'user-1' },
        order: { created_at: 'DESC' },
        take: 100,
      });
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated results with default page/limit', async () => {
      const mockLogs = [{ id: 'log-1' }];
      const qb = createMockQueryBuilder(mockLogs, 1);
      mockAuditLogRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllPaginated({});

      expect(result.data).toEqual(mockLogs);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('should apply entity_type filter', async () => {
      const qb = createMockQueryBuilder([], 0);
      mockAuditLogRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllPaginated({ entity_type: 'task' });

      expect(qb.andWhere).toHaveBeenCalledWith('audit.entity_type = :entity_type', {
        entity_type: 'task',
      });
    });

    it('should apply action filter', async () => {
      const qb = createMockQueryBuilder([], 0);
      mockAuditLogRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllPaginated({ action: 'approve' });

      expect(qb.andWhere).toHaveBeenCalledWith('audit.action = :action', { action: 'approve' });
    });

    it('should apply actor_id filter', async () => {
      const qb = createMockQueryBuilder([], 0);
      mockAuditLogRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllPaginated({ actor_id: 'user-uuid-1' });

      expect(qb.andWhere).toHaveBeenCalledWith('audit.actor_id = :actor_id', {
        actor_id: 'user-uuid-1',
      });
    });

    it('should apply date range filters', async () => {
      const qb = createMockQueryBuilder([], 0);
      mockAuditLogRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllPaginated({
        from_date: '2026-01-01',
        to_date: '2026-12-31',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('audit.created_at >= :fromDate', {
        fromDate: '2026-01-01',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('audit.created_at <= :toDate', {
        toDate: '2026-12-31',
      });
    });

    it('should apply custom pagination', async () => {
      const qb = createMockQueryBuilder([], 0);
      mockAuditLogRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllPaginated({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('log — request context snapshot', () => {
    beforeEach(() => mockAuditLogRepo.create.mockImplementation((v) => v));

    it('fills actor + request fields from the audit context', async () => {
      await auditContext.run(
        { userId: 'u-1', role: 'management', name: 'M Satu', ip: '10.0.0.9', requestId: 'r-1' },
        () => service.log({ entity_type: 'audit_log', action: 'export' }),
      );
      expect(mockAuditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_id: 'u-1',
          actor_role: 'management',
          actor_name: 'M Satu',
          ip: '10.0.0.9',
          request_id: 'r-1',
          entity_id: null,
        }),
      );
    });

    it('does not label a different explicit actor with the context actor snapshot', async () => {
      await auditContext.run({ userId: 'u-1', role: 'management', name: 'M Satu' }, () =>
        service.log({ entity_type: 'task', action: 'verify', actor_id: 'u-2' }),
      );
      expect(mockAuditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ actor_id: 'u-2', actor_role: null, actor_name: null }),
      );
    });

    it('marks actor-less entries as system', async () => {
      await service.log({ entity_type: 'shift', action: 'auto_close' });
      expect(mockAuditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ actor_id: null, source: 'system' }),
      );
    });
  });

  describe('findAllPaginated — search', () => {
    it('escapes LIKE wildcards in free-text search', async () => {
      const qb = createMockQueryBuilder([], 0);
      mockAuditLogRepo.createQueryBuilder.mockReturnValue(qb);
      await service.findAllPaginated({ q: '50%_off' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(audit.entity_label ILIKE :like OR audit.actor_name ILIKE :like)',
        { like: '%50\\%\\_off%' },
      );
    });
  });
});
