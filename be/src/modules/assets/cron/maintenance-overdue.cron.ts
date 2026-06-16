import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AssetMaintenance } from '../entities/asset-maintenance.entity';
import { MaintenanceStatus } from '../enums/asset.enums';

@Injectable()
export class MaintenanceOverdueCron {
  private readonly logger = new Logger(MaintenanceOverdueCron.name);

  constructor(
    @InjectRepository(AssetMaintenance)
    private maintenanceRepo: Repository<AssetMaintenance>,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'Asia/Jakarta' })
  async markOverdueMaintenance(): Promise<void> {
    const result = await this.maintenanceRepo.update(
      {
        status: MaintenanceStatus.SCHEDULED,
        scheduled_at: LessThan(new Date()),
      },
      { status: MaintenanceStatus.OVERDUE },
    );

    this.logger.log(`Marked ${result.affected || 0} maintenance records as overdue`);
  }
}
