import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PlantSeedsService } from './plant-seeds.service';
import { PlantSeed } from './entities/plant-seed.entity';
import { SeedTransaction } from './entities/seed-transaction.entity';

describe('PlantSeedsService', () => {
  let module: TestingModule;
  let service: PlantSeedsService;
  let seedRepository: jest.Mocked<Repository<PlantSeed>>;
  let transactionRepository: jest.Mocked<Repository<SeedTransaction>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockSeedId = 'seed-11111111-1111-1111-1111-111111111111';
  const mockUserId = 'user-11111111-1111-1111-1111-111111111111';
  const mockSpeciesId = 'species-11111111-1111-1111-1111-111111111111';

  const mockSeed: PlantSeed = {
    id: mockSeedId,
    nameId: 'Bibit Pucuk Merah A',
    speciesId: mockSpeciesId,
    unit: 'gram',
    stockQty: 100,
    lastCountedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction: SeedTransaction = {
    id: 'tx-11111111-1111-1111-1111-111111111111',
    seedId: mockSeedId,
    transactionType: 'purchase',
    qty: 50,
    unitPrice: 5000,
    supplier: 'PT Kebun Maju',
    receiptUrl: null,
    toRayonId: null,
    toAreaId: null,
    recipientName: null,
    occurredAt: new Date(),
    recordedBy: mockUserId,
    notes: null,
    createdAt: new Date(),
  };

  const mockSeedRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as any;

  const mockTransactionRepository = {
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
    getManyAndCount: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    setLock: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        PlantSeedsService,
        {
          provide: getRepositoryToken(PlantSeed),
          useValue: mockSeedRepository,
        },
        {
          provide: getRepositoryToken(SeedTransaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlantSeedsService>(PlantSeedsService);
    seedRepository = module.get(getRepositoryToken(PlantSeed)) as jest.Mocked<
      Repository<PlantSeed>
    >;
    transactionRepository = module.get(getRepositoryToken(SeedTransaction)) as jest.Mocked<
      Repository<SeedTransaction>
    >;
    dataSource = module.get(DataSource) as jest.Mocked<DataSource>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return seeds list with pagination', async () => {
      mockSeedRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.skip.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.take.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockSeed], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toEqual([mockSeed]);
      expect(result.total).toBe(1);
    });

    it('should search by nameId using ILIKE', async () => {
      mockSeedRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.skip.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.take.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockSeed], 1]);

      await service.findAll({
        search: 'Pucuk',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ps.nameId ILIKE :search', {
        search: '%Pucuk%',
      });
    });

    it('should apply default pagination', async () => {
      mockSeedRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.skip.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.take.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockSeed], 1]);

      await service.findAll({});

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });

  describe('findOne', () => {
    it('should return seed when found', async () => {
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);

      const result = await service.findOne(mockSeedId);

      expect(result).toEqual(mockSeed);
    });

    it('should throw NotFoundException when seed not found', async () => {
      mockSeedRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockSeedId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSeed', () => {
    it('should create new seed successfully', async () => {
      mockSeedRepository.findOne.mockResolvedValue(null);
      mockSeedRepository.create.mockReturnValue(mockSeed);
      mockSeedRepository.save.mockResolvedValue(mockSeed);

      const result = await service.createSeed({
        nameId: 'Bibit Pucuk Merah A',
        unit: 'gram',
        stockQty: 100,
      });

      expect(result).toEqual(mockSeed);
      expect(mockSeedRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if nameId already exists', async () => {
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);

      await expect(
        service.createSeed({
          nameId: 'Bibit Pucuk Merah A',
          unit: 'gram',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should default stockQty to 0 if not provided', async () => {
      mockSeedRepository.findOne.mockResolvedValue(null);
      mockSeedRepository.create.mockReturnValue({
        ...mockSeed,
        stockQty: 0,
      });
      mockSeedRepository.save.mockResolvedValue({
        ...mockSeed,
        stockQty: 0,
      });

      const result = await service.createSeed({
        nameId: 'New Seed',
        unit: 'piece',
      });

      expect(result.stockQty).toBe(0);
    });
  });

  describe('updateSeed', () => {
    it('should update seed with new nameId', async () => {
      const updatedSeed = { ...mockSeed, nameId: 'Updated Name' };
      mockSeedRepository.findOne.mockResolvedValueOnce(mockSeed);
      mockSeedRepository.findOne.mockResolvedValueOnce(null);
      mockSeedRepository.save.mockResolvedValue(updatedSeed);

      const result = await service.updateSeed(mockSeedId, {
        nameId: 'Updated Name',
      });

      expect(result.nameId).toBe('Updated Name');
      expect(mockSeedRepository.save).toHaveBeenCalled();
    });

    it('should update seed with new unit', async () => {
      const updatedSeed = { ...mockSeed, unit: 'piece' as const };
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);
      mockSeedRepository.save.mockResolvedValue(updatedSeed);

      const result = await service.updateSeed(mockSeedId, {
        unit: 'piece',
      });

      expect(result.unit).toBe('piece');
      expect(mockSeedRepository.save).toHaveBeenCalled();
    });

    it('should update seed with new speciesId', async () => {
      const newSpeciesId = 'species-22222222-2222-2222-2222-222222222222';
      const updatedSeed = { ...mockSeed, speciesId: newSpeciesId };
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);
      mockSeedRepository.save.mockResolvedValue(updatedSeed);

      const result = await service.updateSeed(mockSeedId, {
        speciesId: newSpeciesId,
      });

      expect(result.speciesId).toBe(newSpeciesId);
      expect(mockSeedRepository.save).toHaveBeenCalled();
    });

    it('should clear speciesId if set to null', async () => {
      const updatedSeed = { ...mockSeed, speciesId: null };
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);
      mockSeedRepository.save.mockResolvedValue(updatedSeed);

      const result = await service.updateSeed(mockSeedId, {
        speciesId: null,
      });

      expect(result.speciesId).toBeNull();
      expect(mockSeedRepository.save).toHaveBeenCalled();
    });

    it('should update multiple fields at once', async () => {
      const updatedSeed = {
        ...mockSeed,
        nameId: 'New Name',
        unit: 'packet' as const,
        speciesId: 'species-22222222-2222-2222-2222-222222222222',
      };
      mockSeedRepository.findOne.mockResolvedValueOnce(mockSeed);
      mockSeedRepository.findOne.mockResolvedValueOnce(null);
      mockSeedRepository.save.mockResolvedValue(updatedSeed);

      const result = await service.updateSeed(mockSeedId, {
        nameId: 'New Name',
        unit: 'packet',
        speciesId: 'species-22222222-2222-2222-2222-222222222222',
      });

      expect(result.nameId).toBe('New Name');
      expect(result.unit).toBe('packet');
      expect(result.speciesId).toBe('species-22222222-2222-2222-2222-222222222222');
      expect(mockSeedRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if seed not found', async () => {
      mockSeedRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSeed(mockSeedId, {
          nameId: 'New Name',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new nameId already exists', async () => {
      const existingSeed = {
        ...mockSeed,
        id: 'seed-22222222-2222-2222-2222-222222222222',
        nameId: 'Existing Name',
      };
      mockSeedRepository.findOne
        .mockResolvedValueOnce(mockSeed)
        .mockResolvedValueOnce(existingSeed);

      await expect(
        service.updateSeed(mockSeedId, {
          nameId: 'Existing Name',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same nameId without conflict', async () => {
      const updatedSeed = mockSeed;
      mockSeedRepository.findOne.mockResolvedValueOnce(mockSeed);
      mockSeedRepository.save.mockResolvedValue(updatedSeed);

      const result = await service.updateSeed(mockSeedId, {
        nameId: mockSeed.nameId,
      });

      expect(result).toEqual(mockSeed);
      expect(mockSeedRepository.save).toHaveBeenCalled();
    });

    it('should not check nameId uniqueness if nameId not provided', async () => {
      const updatedSeed = { ...mockSeed, unit: 'packet' as const };
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);
      mockSeedRepository.save.mockResolvedValue(updatedSeed);

      await service.updateSeed(mockSeedId, {
        unit: 'packet',
      });

      // findOne should only be called once (for finding the seed)
      expect(mockSeedRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockSeedRepository.save).toHaveBeenCalled();
    });

    it('should only update provided fields', async () => {
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);
      mockSeedRepository.save.mockResolvedValue(mockSeed);

      const updatedSeed = { ...mockSeed };
      updatedSeed.unit = 'packet';
      mockSeedRepository.save.mockResolvedValue(updatedSeed);

      const result = await service.updateSeed(mockSeedId, {
        unit: 'packet',
      });

      // Verify that other fields remain unchanged
      expect(result.nameId).toBe(mockSeed.nameId);
      expect(result.speciesId).toBe(mockSeed.speciesId);
    });
  });

  describe('recordTransaction', () => {
    it('should record purchase transaction and increase stock', async () => {
      const testSeed = { ...mockSeed, stockQty: 100 };
      const qb = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(testSeed),
      };

      const transactionManager = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(qb),
        }),
        create: jest.fn().mockReturnValue(mockTransaction),
        save: jest.fn(),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(transactionManager),
      );

      await service.recordTransaction(
        {
          seedId: mockSeedId,
          transactionType: 'purchase',
          qty: 50,
          occurredAt: new Date(),
        },
        mockUserId,
      );

      expect(transactionManager.save).toHaveBeenCalledWith(testSeed);
      expect(testSeed.stockQty).toBe(150);
    });

    it('should record distribution transaction and decrease stock', async () => {
      const testSeed = { ...mockSeed, stockQty: 100 };
      const qb = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(testSeed),
      };

      const transactionManager = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(qb),
        }),
        create: jest.fn().mockReturnValue(mockTransaction),
        save: jest.fn(),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(transactionManager),
      );

      const result = await service.recordTransaction(
        {
          seedId: mockSeedId,
          transactionType: 'distribution',
          qty: 30,
          toRayonId: 'rayon-1',
          recipientName: 'Pak Joko',
          occurredAt: new Date(),
        },
        mockUserId,
      );

      expect(result.seed.stockQty).toBe(70);
    });

    it('should throw ConflictException if distribution exceeds stock', async () => {
      const lowStockSeed = { ...mockSeed, stockQty: 10 };

      const qb = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(lowStockSeed),
      };

      const transactionManager = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(qb),
        }),
        create: jest.fn(),
        save: jest.fn(),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(transactionManager),
      );

      await expect(
        service.recordTransaction(
          {
            seedId: mockSeedId,
            transactionType: 'distribution',
            qty: 50,
            occurredAt: new Date(),
          },
          mockUserId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should record adjustment transaction', async () => {
      const testSeed = { ...mockSeed, stockQty: 100 };
      const qb = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(testSeed),
      };

      const transactionManager = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(qb),
        }),
        create: jest.fn().mockReturnValue(mockTransaction),
        save: jest.fn(),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(transactionManager),
      );

      const result = await service.recordTransaction(
        {
          seedId: mockSeedId,
          transactionType: 'adjustment',
          qty: 25,
          notes: 'Physical count correction',
          occurredAt: new Date(),
        },
        mockUserId,
      );

      expect(result.seed.stockQty).toBe(125);
    });

    it('should throw BadRequestException if qty <= 0', async () => {
      await expect(
        service.recordTransaction(
          {
            seedId: mockSeedId,
            transactionType: 'purchase',
            qty: 0,
            occurredAt: new Date(),
          },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use pessimistic write lock', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSeed),
      };

      const transactionManager = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(qb),
        }),
        create: jest.fn().mockReturnValue(mockTransaction),
        save: jest.fn(),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(transactionManager),
      );

      await service.recordTransaction(
        {
          seedId: mockSeedId,
          transactionType: 'purchase',
          qty: 50,
          occurredAt: new Date(),
        },
        mockUserId,
      );

      expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('should throw NotFoundException if seed not found', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      const transactionManager = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(qb),
        }),
        create: jest.fn(),
        save: jest.fn(),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        (callback: (em: unknown) => Promise<unknown>) => callback(transactionManager),
      );

      await expect(
        service.recordTransaction(
          {
            seedId: mockSeedId,
            transactionType: 'purchase',
            qty: 50,
            occurredAt: new Date(),
          },
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTransactions', () => {
    it('should return transactions for a seed with pagination', async () => {
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);
      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.skip.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.take.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.getTransactions(mockSeedId, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual([mockTransaction]);
      expect(result.total).toBe(1);
    });

    it('should filter by transaction type', async () => {
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);
      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.skip.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.take.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTransaction], 1]);

      await service.getTransactions(mockSeedId, {
        type: 'purchase',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('st.transactionType = :type', {
        type: 'purchase',
      });
    });

    it('should filter by date range', async () => {
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);
      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.skip.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.take.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTransaction], 1]);

      const from = new Date('2026-04-01');
      const to = new Date('2026-04-30');

      await service.getTransactions(mockSeedId, {
        from,
        to,
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('st.occurredAt >= :from', { from });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('st.occurredAt <= :to', { to });
    });

    it('should throw NotFoundException if seed does not exist', async () => {
      mockSeedRepository.findOne.mockResolvedValue(null);

      await expect(service.getTransactions(mockSeedId, { page: 1, limit: 20 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should sort by occurredAt DESC', async () => {
      mockSeedRepository.findOne.mockResolvedValue(mockSeed);
      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.skip.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.take.mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTransaction], 1]);

      await service.getTransactions(mockSeedId, {
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('st.occurredAt', 'DESC');
    });
  });
});
