import { Test, TestingModule } from '@nestjs/testing';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { User, UserRole } from '../users/entities/user.entity';
import { AssetStatus, AssetCondition } from './enums/asset.enums';
import { CreateAssetDto } from './dto/create-asset.dto';
import { CheckoutAssetDto } from './dto/checkout-asset.dto';

describe('AssetsController', () => {
  let controller: AssetsController;
  let mockService: any;

  const mockUser = {
    id: 'user-1',
    role: UserRole.KORLAP,
    area_id: 'area-1',
  } as User;

  beforeEach(async () => {
    mockService = {
      findCategories: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      generateQr: jest.fn(),
      generateBulkQr: jest.fn(),
      scanByCode: jest.fn(),
      checkout: jest.fn(),
      returnAsset: jest.fn(),
      listAssignments: jest.fn(),
      myAssets: jest.fn(),
      createMaintenance: jest.fn(),
      updateMaintenance: jest.fn(),
      maintenanceCalendar: jest.fn(),
      overdueMaintenance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetsController],
      providers: [{ provide: AssetsService, useValue: mockService }],
    }).compile();

    controller = module.get<AssetsController>(AssetsController);
  });

  describe('getCategories', () => {
    it('should call service.findCategories', async () => {
      mockService.findCategories.mockResolvedValue([]);

      await controller.getCategories();

      expect(mockService.findCategories).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should call service.findAll with user and query', async () => {
      const query = { page: 1, limit: 50 };
      mockService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });

      await controller.list(query as any, mockUser);

      expect(mockService.findAll).toHaveBeenCalledWith(mockUser, query);
    });
  });

  describe('getById', () => {
    it('should call service.findOne with id and user', async () => {
      mockService.findOne.mockResolvedValue({ id: 'asset-1' });

      await controller.getById('asset-1', mockUser);

      expect(mockService.findOne).toHaveBeenCalledWith('asset-1', mockUser);
    });
  });

  describe('create', () => {
    it('should call service.create with dto and user', async () => {
      const dto: CreateAssetDto = {
        category_id: 'cat-1',
        name: 'Sapu Lidi',
      };
      mockService.create.mockResolvedValue({ id: 'asset-1' });

      await controller.create(dto, mockUser);

      expect(mockService.create).toHaveBeenCalledWith(dto, mockUser);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto, and user', async () => {
      const dto = { name: 'Updated Name' };
      mockService.update.mockResolvedValue({ id: 'asset-1' });

      await controller.update('asset-1', dto as any, mockUser);

      expect(mockService.update).toHaveBeenCalledWith('asset-1', dto, mockUser);
    });
  });

  describe('delete', () => {
    it('should call service.softDelete with id and user', async () => {
      mockService.softDelete.mockResolvedValue(undefined);

      await controller.delete('asset-1', mockUser);

      expect(mockService.softDelete).toHaveBeenCalledWith('asset-1', mockUser);
    });
  });

  describe('generateQr', () => {
    it('should call service.generateQr and return url', async () => {
      mockService.generateQr.mockResolvedValue('https://s3.example.com/presigned');

      const result = await controller.generateQr('asset-1');

      expect(mockService.generateQr).toHaveBeenCalledWith('asset-1');
      expect(result).toEqual({ url: 'https://s3.example.com/presigned' });
    });
  });

  describe('generateBulkQr', () => {
    it('should call service.generateBulkQr with asset ids', async () => {
      const dto = { asset_ids: ['asset-1', 'asset-2'] };
      mockService.generateBulkQr.mockResolvedValue([]);

      await controller.generateBulkQr(dto);

      expect(mockService.generateBulkQr).toHaveBeenCalledWith(dto.asset_ids);
    });
  });

  describe('scanByCode', () => {
    it('should call service.scanByCode with code', async () => {
      mockService.scanByCode.mockResolvedValue({ id: 'asset-1', asset_code: 'AK-UTARA-001' });

      await controller.scanByCode('AK-UTARA-001');

      expect(mockService.scanByCode).toHaveBeenCalledWith('AK-UTARA-001');
    });
  });

  describe('checkout', () => {
    it('should call service.checkout with id, dto, and user', async () => {
      const dto: CheckoutAssetDto = {
        condition_at_checkout: AssetCondition.GOOD,
      };
      mockService.checkout.mockResolvedValue({ id: 'assign-1' });

      await controller.checkout('asset-1', dto, mockUser);

      expect(mockService.checkout).toHaveBeenCalledWith('asset-1', dto, mockUser);
    });
  });

  describe('returnAsset', () => {
    it('should call service.returnAsset with id, dto, and user', async () => {
      const dto = { condition_at_return: AssetCondition.GOOD };
      mockService.returnAsset.mockResolvedValue({ id: 'assign-1' });

      await controller.returnAsset('asset-1', dto as any, mockUser);

      expect(mockService.returnAsset).toHaveBeenCalledWith('asset-1', dto, mockUser);
    });
  });

  describe('getAssignments', () => {
    it('should call service.listAssignments with id and user', async () => {
      mockService.listAssignments.mockResolvedValue([]);

      await controller.getAssignments('asset-1', mockUser);

      expect(mockService.listAssignments).toHaveBeenCalledWith('asset-1', mockUser);
    });
  });

  describe('getMyAssets', () => {
    it('should call service.myAssets with user', async () => {
      mockService.myAssets.mockResolvedValue([]);

      await controller.getMyAssets(mockUser);

      expect(mockService.myAssets).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('createMaintenance', () => {
    it('should call service.createMaintenance with id, dto, and user', async () => {
      const dto = { maintenance_type: 'routine', scheduled_at: new Date().toISOString() };
      mockService.createMaintenance.mockResolvedValue({ id: 'maint-1' });

      await controller.createMaintenance('asset-1', dto as any, mockUser);

      expect(mockService.createMaintenance).toHaveBeenCalledWith('asset-1', dto, mockUser);
    });
  });

  describe('updateMaintenance', () => {
    it('should call service.updateMaintenance with id, dto, and user', async () => {
      const dto = { status: 'completed' };
      mockService.updateMaintenance.mockResolvedValue({ id: 'maint-1' });

      await controller.updateMaintenance('maint-1', dto as any, mockUser);

      expect(mockService.updateMaintenance).toHaveBeenCalledWith('maint-1', dto, mockUser);
    });
  });

  describe('maintenanceCalendar', () => {
    it('should call service.maintenanceCalendar with month/year and user', async () => {
      mockService.maintenanceCalendar.mockResolvedValue([]);

      await controller.maintenanceCalendar(3, 2026, mockUser);

      expect(mockService.maintenanceCalendar).toHaveBeenCalledWith(
        { month: 3, year: 2026 },
        mockUser,
      );
    });
  });

  describe('overdueMaintenance', () => {
    it('should call service.overdueMaintenance with user', async () => {
      mockService.overdueMaintenance.mockResolvedValue([]);

      await controller.overdueMaintenance(mockUser);

      expect(mockService.overdueMaintenance).toHaveBeenCalledWith(mockUser);
    });
  });
});
