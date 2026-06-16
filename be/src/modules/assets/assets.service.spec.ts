import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Asset } from './entities/asset.entity';
import { AssetCategory } from './entities/asset-category.entity';
import { AssetAssignment } from './entities/asset-assignment.entity';
import { AssetMaintenance } from './entities/asset-maintenance.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserArea } from '../user-areas/entities/user-area.entity';
import { Area } from '../areas/entities/area.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { QrCodeService } from './services/qr-code.service';
import { AuditLogService } from '../audit/audit.service';
import { AssetStatus, AssetCondition, MaintenanceStatus, MaintenanceType } from './enums/asset.enums';
import { CreateAssetDto } from './dto/create-asset.dto';
import { CheckoutAssetDto } from './dto/checkout-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';

describe('AssetsService', () => {
  let service: AssetsService;
  let mockAssetRepo: any;
  let mockCategoryRepo: any;
  let mockAssignmentRepo: any;
  let mockMaintenanceRepo: any;
  let mockUserRepo: any;
  let mockUserAreaRepo: any;
  let mockAreaRepo: any;
  let mockRayonRepo: any;
  let mockQrCodeService: any;
  let mockAuditService: any;

  const mockUser = {
    id: 'user-1',
    role: UserRole.KORLAP,
    area_id: 'area-1',
    rayon_id: null,
  } as unknown as User;

  const mockCategory = {
    id: 'cat-1',
    name: 'Alat Kebersihan',
    code_prefix: 'AK',
    sort_order: 0,
  } as AssetCategory;

  const mockAsset = {
    id: 'asset-1',
    category_id: 'cat-1',
    asset_code: 'AK-UTARA-001',
    name: 'Sapu Lidi',
    status: AssetStatus.AVAILABLE,
    condition: AssetCondition.GOOD,
    area_id: 'area-1',
    rayon_id: 'rayon-1',
    qr_code_url: null,
    photo_url: null,
    deleted_at: null,
  } as Asset;

  beforeEach(async () => {
    mockAssetRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        connection: {
          createQueryRunner: jest.fn(),
        },
        findOne: jest.fn(),
      },
    };

    mockCategoryRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockAssignmentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockMaintenanceRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockUserRepo = {
      findOne: jest.fn(),
    };

    mockUserAreaRepo = {
      find: jest.fn().mockResolvedValue([{ area_id: 'area-1' }]),
    };

    mockAreaRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'area-1', rayon_id: 'rayon-1' }),
    };

    mockRayonRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'rayon-1', code: 'UTARA' }),
    };

    mockQrCodeService = {
      generate: jest.fn().mockResolvedValue('qr-codes/AK-UTARA-001.png'),
      presignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned'),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: getRepositoryToken(Asset), useValue: mockAssetRepo },
        { provide: getRepositoryToken(AssetCategory), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(AssetAssignment), useValue: mockAssignmentRepo },
        { provide: getRepositoryToken(AssetMaintenance), useValue: mockMaintenanceRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserArea), useValue: mockUserAreaRepo },
        { provide: getRepositoryToken(Area), useValue: mockAreaRepo },
        { provide: getRepositoryToken(Rayon), useValue: mockRayonRepo },
        { provide: QrCodeService, useValue: mockQrCodeService },
        { provide: AuditLogService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  describe('findCategories', () => {
    it('should return sorted categories', async () => {
      const categories = [mockCategory];
      mockCategoryRepo.find.mockResolvedValue(categories);

      const result = await service.findCategories();

      expect(result).toEqual(categories);
      expect(mockCategoryRepo.find).toHaveBeenCalledWith({ order: { sort_order: 'ASC' } });
    });
  });

  describe('findOne', () => {
    it('should return asset with presigned URLs', async () => {
      const assetWithRefs = { ...mockAsset, assignments: [], maintenances: [], qr_code_url: 'qr-codes/AK-UTARA-001.png' };
      mockAssetRepo.findOne.mockResolvedValue(assetWithRefs);

      const result = await service.findOne('asset-1', mockUser);

      expect(result).toBeDefined();
      expect(mockQrCodeService.presignedUrl).toHaveBeenCalledWith('qr-codes/AK-UTARA-001.png');
    });

    it('should throw not found', async () => {
      mockAssetRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create asset and generate QR', async () => {
      const dto: CreateAssetDto = {
        category_id: 'cat-1',
        area_id: 'area-1',
        name: 'Sapu Lidi',
      };

      mockCategoryRepo.findOne.mockResolvedValue(mockCategory);
      mockAssetRepo.manager.findOne.mockResolvedValue({ id: 'rayon-1', code: 'UTARA' });
      mockAssetRepo.create.mockReturnValue(mockAsset);
      mockAssetRepo.save.mockResolvedValue(mockAsset);
      mockQrCodeService.generate.mockResolvedValue('qr-code-key');

      const result = await service.create(dto, mockUser);

      expect(result).toBeDefined();
      expect(mockQrCodeService.generate).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'asset',
          action: 'created',
          actor_id: mockUser.id,
        }),
      );
    });

    it('should throw forbidden if not asset manager', async () => {
      const satgasUser = { ...mockUser, role: UserRole.SATGAS };

      await expect(service.create({} as CreateAssetDto, satgasUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkout', () => {
    it('should create assignment and update status', async () => {
      const dto: CheckoutAssetDto = {
        condition_at_checkout: AssetCondition.GOOD,
      };

      mockAssetRepo.findOne.mockResolvedValue(mockAsset);
      mockAssignmentRepo.create.mockReturnValue({
        id: 'assign-1',
        asset_id: 'asset-1',
        assigned_to: mockUser.id,
      });

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({
            id: 'assign-1',
            asset_id: 'asset-1',
          }),
        },
      };

      mockAssetRepo.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

      const result = await service.checkout('asset-1', dto, mockUser);

      expect(result).toBeDefined();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should reject checkout if asset not available', async () => {
      const unavailableAsset = { ...mockAsset, status: AssetStatus.IN_USE };
      mockAssetRepo.findOne.mockResolvedValue(unavailableAsset);

      const dto: CheckoutAssetDto = {
        condition_at_checkout: AssetCondition.GOOD,
      };

      await expect(service.checkout('asset-1', dto, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('returnAsset', () => {
    it('should update assignment and asset status', async () => {
      mockAssetRepo.findOne.mockResolvedValue(mockAsset);
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'assign-1',
        asset_id: 'asset-1',
        returned_at: null,
      });

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({
            id: 'assign-1',
            returned_at: new Date(),
          }),
        },
      };

      mockAssetRepo.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

      const dto: ReturnAssetDto = {
        condition_at_return: AssetCondition.GOOD,
      };

      const result = await service.returnAsset('asset-1', dto, mockUser);

      expect(result).toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should move asset to maintenance if unusable', async () => {
      mockAssetRepo.findOne.mockResolvedValue(mockAsset);
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'assign-1',
        returned_at: null,
      });

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({}),
        },
      };

      mockAssetRepo.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

      const dto: ReturnAssetDto = {
        condition_at_return: AssetCondition.UNUSABLE,
      };

      await service.returnAsset('asset-1', dto, mockUser);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('generateBulkQr', () => {
    it('should reject if more than 50 assets', async () => {
      const ids = Array.from({ length: 51 }, (_, i) => `asset-${i}`);

      await expect(service.generateBulkQr(ids)).rejects.toThrow(BadRequestException);
    });

    it('should generate QR for multiple assets', async () => {
      const ids = ['asset-1', 'asset-2'];
      mockAssetRepo.findBy.mockResolvedValue([
        { id: 'asset-1', asset_code: 'AK-UTARA-001' },
        { id: 'asset-2', asset_code: 'AK-UTARA-002' },
      ]);

      mockAssetRepo.findOne.mockResolvedValue({ id: 'asset-1', asset_code: 'AK-UTARA-001' });
      mockQrCodeService.generate.mockResolvedValue('qr-key');
      mockAssetRepo.save.mockResolvedValue({});

      const result = await service.generateBulkQr(ids);

      expect(result).toHaveLength(2);
      expect(mockQrCodeService.generate).toHaveBeenCalledTimes(2);
    });
  });

  describe('myAssets', () => {
    it('should return active assignments for user', async () => {
      const assignments = [
        { id: 'assign-1', assigned_to: mockUser.id, returned_at: null },
      ];
      mockAssignmentRepo.find.mockResolvedValue(assignments);

      const result = await service.myAssets(mockUser);

      expect(result).toHaveLength(1);
      expect(mockAssignmentRepo.find).toHaveBeenCalled();
    });
  });

  describe('createMaintenance', () => {
    it('should create maintenance and move asset to maintenance status', async () => {
      mockAssetRepo.findOne.mockResolvedValue(mockAsset);

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({
            id: 'maint-1',
            asset_id: 'asset-1',
          }),
          findOne: jest.fn(),
        },
      };

      mockAssetRepo.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

      const result = await service.createMaintenance(
        'asset-1',
        {
          maintenance_type: MaintenanceType.ROUTINE,
          scheduled_at: new Date().toISOString(),
        },
        mockUser,
      );

      expect(result).toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('updateMaintenance', () => {
    it('should update maintenance status and set asset next_maintenance_at', async () => {
      const maintenance = {
        id: 'maint-1',
        asset_id: 'asset-1',
        status: MaintenanceStatus.SCHEDULED,
      };

      mockMaintenanceRepo.findOne.mockResolvedValue(maintenance);
      mockAssetRepo.findOne.mockResolvedValue(mockAsset);
      mockMaintenanceRepo.save.mockResolvedValue({
        ...maintenance,
        status: MaintenanceStatus.COMPLETED,
      });
      mockAssetRepo.save.mockResolvedValue(mockAsset);

      const result = await service.updateMaintenance('maint-1', {
        status: MaintenanceStatus.COMPLETED,
        condition: AssetCondition.GOOD,
      }, mockUser);

      expect(result).toBeDefined();
      expect(mockAssetRepo.save).toHaveBeenCalled();
    });
  });
});
