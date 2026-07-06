import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaintenanceOverdueCron } from './maintenance-overdue.cron';
import { AssetMaintenance } from '../entities/asset-maintenance.entity';
import { MaintenanceStatus } from '../enums/asset.enums';

describe('MaintenanceOverdueCron', () => {
  let cron: MaintenanceOverdueCron;
  let mockMaintenanceRepo: any;

  beforeEach(async () => {
    mockMaintenanceRepo = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceOverdueCron,
        {
          provide: getRepositoryToken(AssetMaintenance),
          useValue: mockMaintenanceRepo,
        },
      ],
    }).compile();

    cron = module.get<MaintenanceOverdueCron>(MaintenanceOverdueCron);
  });

  describe('markOverdueMaintenance', () => {
    it('should mark scheduled maintenance as overdue when past scheduled_at', async () => {
      mockMaintenanceRepo.update.mockResolvedValue({ affected: 3 });

      await cron.markOverdueMaintenance();

      expect(mockMaintenanceRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MaintenanceStatus.SCHEDULED,
        }),
        { status: MaintenanceStatus.OVERDUE },
      );
    });

    it('should handle zero affected records', async () => {
      mockMaintenanceRepo.update.mockResolvedValue({ affected: 0 });

      await cron.markOverdueMaintenance();

      expect(mockMaintenanceRepo.update).toHaveBeenCalled();
    });

    it('should handle null affected records', async () => {
      mockMaintenanceRepo.update.mockResolvedValue({ affected: null });

      await cron.markOverdueMaintenance();

      expect(mockMaintenanceRepo.update).toHaveBeenCalled();
    });
  });
});
