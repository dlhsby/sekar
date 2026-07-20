import { Test, TestingModule } from '@nestjs/testing';
import { PlantSeedsController } from './plant-seeds.controller';
import { PlantSeedsService } from './plant-seeds.service';
import { PlantSeed } from './entities/plant-seed.entity';
import { SeedTransaction } from './entities/seed-transaction.entity';
import { UserRole } from '../users/entities/user.entity';

describe('PlantSeedsController', () => {
  let controller: PlantSeedsController;
  let service: jest.Mocked<PlantSeedsService>;

  const mockUserId = 'user-11111111-1111-1111-1111-111111111111';
  const mockSeedId = 'seed-11111111-1111-1111-1111-111111111111';

  const mockSeed: PlantSeed = {
    id: mockSeedId,
    nameId: 'Bibit Pucuk Merah A',
    speciesId: 'species-11111111-1111-1111-1111-111111111111',
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
    toDistrictId: null,
    toAreaId: null,
    recipientName: null,
    occurredAt: new Date(),
    recordedBy: mockUserId,
    notes: null,
    createdAt: new Date(),
  };

  const mockUser = {
    id: mockUserId,
    email: 'admin@test.com',
    role: UserRole.ADMIN_RAYON,
    district_id: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlantSeedsController],
      providers: [
        {
          provide: PlantSeedsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            createSeed: jest.fn(),
            updateSeed: jest.fn(),
            recordTransaction: jest.fn(),
            getTransactions: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PlantSeedsController>(PlantSeedsController);
    service = module.get(PlantSeedsService) as jest.Mocked<PlantSeedsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return list of seeds', async () => {
      service.findAll.mockResolvedValue({ items: [mockSeed], total: 1 });

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(result.items).toEqual([mockSeed]);
      expect(result.total).toBe(1);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should pass search query to service', async () => {
      service.findAll.mockResolvedValue({ items: [mockSeed], total: 1 });

      await controller.findAll({ search: 'Pucuk', page: 1, limit: 20 });

      expect(service.findAll).toHaveBeenCalledWith({
        search: 'Pucuk',
        page: 1,
        limit: 20,
      });
    });
  });

  describe('createSeed', () => {
    it('should create new seed', async () => {
      service.createSeed.mockResolvedValue(mockSeed);

      const result = await controller.createSeed({
        nameId: 'Bibit Pucuk Merah A',
        unit: 'gram',
        stockQty: 100,
      });

      expect(result).toEqual(mockSeed);
      expect(service.createSeed).toHaveBeenCalledWith({
        nameId: 'Bibit Pucuk Merah A',
        unit: 'gram',
        stockQty: 100,
      });
    });
  });

  describe('updateSeed', () => {
    it('should update seed with all fields', async () => {
      const updatedSeed = {
        ...mockSeed,
        nameId: 'Bibit Pucuk Merah B',
        unit: 'piece' as const,
      };
      service.updateSeed.mockResolvedValue(updatedSeed);

      const result = await controller.updateSeed(mockSeedId, {
        nameId: 'Bibit Pucuk Merah B',
        unit: 'piece',
      });

      expect(result).toEqual(updatedSeed);
      expect(service.updateSeed).toHaveBeenCalledWith(mockSeedId, {
        nameId: 'Bibit Pucuk Merah B',
        unit: 'piece',
      });
    });

    it('should update seed with partial fields', async () => {
      const updatedSeed = {
        ...mockSeed,
        nameId: 'Bibit Pucuk Merah Updated',
      };
      service.updateSeed.mockResolvedValue(updatedSeed);

      const result = await controller.updateSeed(mockSeedId, {
        nameId: 'Bibit Pucuk Merah Updated',
      });

      expect(result).toEqual(updatedSeed);
      expect(service.updateSeed).toHaveBeenCalledWith(mockSeedId, {
        nameId: 'Bibit Pucuk Merah Updated',
      });
    });

    it('should update only species id', async () => {
      const newSpeciesId = 'species-22222222-2222-2222-2222-222222222222';
      const updatedSeed = {
        ...mockSeed,
        speciesId: newSpeciesId,
      };
      service.updateSeed.mockResolvedValue(updatedSeed);

      const result = await controller.updateSeed(mockSeedId, {
        speciesId: newSpeciesId,
      });

      expect(result).toEqual(updatedSeed);
      expect(service.updateSeed).toHaveBeenCalledWith(mockSeedId, {
        speciesId: newSpeciesId,
      });
    });
  });

  describe('findOne', () => {
    it('should return seed by id', async () => {
      service.findOne.mockResolvedValue(mockSeed);

      const result = await controller.findOne(mockSeedId);

      expect(result).toEqual(mockSeed);
      expect(service.findOne).toHaveBeenCalledWith(mockSeedId);
    });
  });

  describe('recordTransaction', () => {
    it('should record transaction with seedId from route param', async () => {
      service.recordTransaction.mockResolvedValue({
        transaction: mockTransaction,
        seed: mockSeed,
      });

      const dto = {
        seedId: '', // Will be overridden
        transactionType: 'purchase' as const,
        qty: 50,
        occurredAt: new Date(),
      };

      const result = await controller.recordTransaction(mockSeedId, dto, mockUser as any);

      expect(result.transaction).toEqual(mockTransaction);
      expect(service.recordTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          seedId: mockSeedId,
          transactionType: 'purchase',
          qty: 50,
        }),
        mockUserId,
      );
    });

    it('should pass user id to service', async () => {
      service.recordTransaction.mockResolvedValue({
        transaction: mockTransaction,
        seed: mockSeed,
      });

      const dto = {
        seedId: '',
        transactionType: 'distribution' as const,
        qty: 30,
        toDistrictId: 'district-1',
        occurredAt: new Date(),
      };

      await controller.recordTransaction(mockSeedId, dto, mockUser as any);

      expect(service.recordTransaction).toHaveBeenCalledWith(expect.any(Object), mockUserId);
    });
  });

  describe('getTransactions', () => {
    it('should return transaction history for seed', async () => {
      service.getTransactions.mockResolvedValue({
        items: [mockTransaction],
        total: 1,
      });

      const result = await controller.getTransactions(mockSeedId, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual([mockTransaction]);
      expect(result.total).toBe(1);
      expect(service.getTransactions).toHaveBeenCalledWith(mockSeedId, {
        page: 1,
        limit: 20,
      });
    });

    it('should filter transactions by type', async () => {
      service.getTransactions.mockResolvedValue({
        items: [mockTransaction],
        total: 1,
      });

      await controller.getTransactions(mockSeedId, {
        type: 'purchase',
        page: 1,
        limit: 20,
      });

      expect(service.getTransactions).toHaveBeenCalledWith(mockSeedId, {
        type: 'purchase',
        page: 1,
        limit: 20,
      });
    });

    it('should filter transactions by date range', async () => {
      service.getTransactions.mockResolvedValue({
        items: [mockTransaction],
        total: 1,
      });

      const from = new Date('2026-04-01');
      const to = new Date('2026-04-30');

      await controller.getTransactions(mockSeedId, {
        from,
        to,
        page: 1,
        limit: 20,
      });

      expect(service.getTransactions).toHaveBeenCalledWith(mockSeedId, {
        from,
        to,
        page: 1,
        limit: 20,
      });
    });
  });
});
