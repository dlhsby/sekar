import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { ServiceCapacityService } from './service-capacity.service';
import { ServiceCapacity } from './entities/service-capacity.entity';

describe('ServiceCapacityService', () => {
  let module: TestingModule;
  let service: ServiceCapacityService;
  let repository: jest.Mocked<Repository<ServiceCapacity>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockDistrictId = 'district-11111111-1111-1111-1111-111111111111';
  const mockYear = 2026;
  const mockIsoWeek = 20;
  const mockServiceType = 'pruning';

  const mockCapacity: ServiceCapacity = {
    id: 'cap-11111111-1111-1111-1111-111111111111',
    districtId: mockDistrictId,
    year: mockYear,
    isoWeek: mockIsoWeek,
    serviceType: mockServiceType,
    capacityUnits: 50,
    bookedUnits: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    getMany: jest.fn(),
    setLock: jest.fn(),
    getOne: jest.fn(),
  };

  const mockTransactionManager = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ServiceCapacityService,
        {
          provide: getRepositoryToken(ServiceCapacity),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ServiceCapacityService>(ServiceCapacityService);
    repository = module.get(getRepositoryToken(ServiceCapacity)) as jest.Mocked<
      Repository<ServiceCapacity>
    >;
    dataSource = module.get(DataSource) as jest.Mocked<DataSource>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findCalendar', () => {
    it('should return rows for given district/year', async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getMany.mockResolvedValue([mockCapacity]);

      const result = await service.findCalendar({
        districtId: mockDistrictId,
        year: mockYear,
      });

      expect(result).toEqual([mockCapacity]);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('sc');
    });

    it('should filter by fromWeek/toWeek and fill missing weeks', async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getMany.mockResolvedValue([
        { ...mockCapacity, isoWeek: 20 },
        { ...mockCapacity, isoWeek: 22 },
      ]);

      const result = await service.findCalendar({
        districtId: mockDistrictId,
        year: mockYear,
        fromWeek: 20,
        toWeek: 22,
      });

      expect(result.length).toBe(3);
      expect(result[0].isoWeek).toBe(20);
      expect(result[1].isoWeek).toBe(21);
      expect(result[1].capacityUnits).toBe(0);
      expect(result[2].isoWeek).toBe(22);
    });

    it('should filter by serviceType', async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getMany.mockResolvedValue([mockCapacity]);

      await service.findCalendar({
        districtId: mockDistrictId,
        year: mockYear,
        serviceType: mockServiceType,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('sc.serviceType = :serviceType', {
        serviceType: mockServiceType,
      });
    });
  });

  describe('upsertCapacity', () => {
    it('should insert new capacity if not exists', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockCapacity);
      mockRepository.save.mockResolvedValue(mockCapacity);

      const result = await service.upsertCapacity({
        districtId: mockDistrictId,
        year: mockYear,
        isoWeek: mockIsoWeek,
        serviceType: mockServiceType,
        capacityUnits: 50,
      });

      expect(result).toEqual(mockCapacity);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update existing capacity', async () => {
      const existing = { ...mockCapacity, capacityUnits: 30 };
      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue({
        ...existing,
        capacityUnits: 50,
      });

      const result = await service.upsertCapacity({
        districtId: mockDistrictId,
        year: mockYear,
        isoWeek: mockIsoWeek,
        serviceType: mockServiceType,
        capacityUnits: 50,
      });

      expect(result.capacityUnits).toBe(50);
    });
  });

  describe('bookAtomic', () => {
    it('should book units successfully', async () => {
      const qb = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockCapacity),
      };

      mockTransactionManager.createQueryBuilder.mockReturnValue(qb as any);
      mockTransactionManager.save.mockResolvedValue({
        ...mockCapacity,
        bookedUnits: 15,
      });

      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(mockTransactionManager),
      );

      const result = await service.bookAtomic({
        districtId: mockDistrictId,
        year: mockYear,
        isoWeek: mockIsoWeek,
        serviceType: mockServiceType,
        units: 5,
      });

      expect(result.bookedUnits).toBe(15);
      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('should throw ConflictException if capacity exceeded', async () => {
      const qb = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          ...mockCapacity,
          bookedUnits: 48,
        }),
      };

      mockTransactionManager.createQueryBuilder.mockReturnValue(qb as any);
      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(mockTransactionManager),
      );

      await expect(
        service.bookAtomic({
          districtId: mockDistrictId,
          year: mockYear,
          isoWeek: mockIsoWeek,
          serviceType: mockServiceType,
          units: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if record not found', async () => {
      const qb = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockTransactionManager.createQueryBuilder.mockReturnValue(qb as any);
      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(mockTransactionManager),
      );

      await expect(
        service.bookAtomic({
          districtId: mockDistrictId,
          year: mockYear,
          isoWeek: mockIsoWeek,
          serviceType: mockServiceType,
          units: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if capacity is 0', async () => {
      const qb = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          ...mockCapacity,
          capacityUnits: 0,
        }),
      };

      mockTransactionManager.createQueryBuilder.mockReturnValue(qb as any);
      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(mockTransactionManager),
      );

      await expect(
        service.bookAtomic({
          districtId: mockDistrictId,
          year: mockYear,
          isoWeek: mockIsoWeek,
          serviceType: mockServiceType,
          units: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('releaseAtomic', () => {
    it('should release units successfully', async () => {
      const qb = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockCapacity),
      };

      mockTransactionManager.createQueryBuilder.mockReturnValue(qb as any);
      mockTransactionManager.save.mockResolvedValue({
        ...mockCapacity,
        bookedUnits: 5,
      });

      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(mockTransactionManager),
      );

      const result = await service.releaseAtomic({
        districtId: mockDistrictId,
        year: mockYear,
        isoWeek: mockIsoWeek,
        serviceType: mockServiceType,
        units: 5,
      });

      expect(result.bookedUnits).toBe(5);
    });

    it('should floor booked_units at 0', async () => {
      const qb = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          ...mockCapacity,
          bookedUnits: 3,
        }),
      };

      mockTransactionManager.createQueryBuilder.mockReturnValue(qb as any);
      mockTransactionManager.save.mockResolvedValue({
        ...mockCapacity,
        bookedUnits: 0,
      });

      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(mockTransactionManager),
      );

      const result = await service.releaseAtomic({
        districtId: mockDistrictId,
        year: mockYear,
        isoWeek: mockIsoWeek,
        serviceType: mockServiceType,
        units: 5,
      });

      expect(result.bookedUnits).toBe(0);
    });

    it('should throw ConflictException if record not found', async () => {
      const qb = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockTransactionManager.createQueryBuilder.mockReturnValue(qb as any);
      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(mockTransactionManager),
      );

      await expect(
        service.releaseAtomic({
          districtId: mockDistrictId,
          year: mockYear,
          isoWeek: mockIsoWeek,
          serviceType: mockServiceType,
          units: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
