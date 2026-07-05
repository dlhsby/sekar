import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { Asset } from './entities/asset.entity';
import { AssetCategory } from './entities/asset-category.entity';
import { AssetAssignment } from './entities/asset-assignment.entity';
import { AssetMaintenance } from './entities/asset-maintenance.entity';
import { QrCodeService } from './services/qr-code.service';
import { MaintenanceOverdueCron } from './cron/maintenance-overdue.cron';
import { User } from '../users/entities/user.entity';
import { UserArea } from '../user-areas/entities/user-area.entity';
import { Area } from '../areas/entities/area.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { SharedModule } from '../../shared/shared.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      AssetCategory,
      AssetAssignment,
      AssetMaintenance,
      User,
      UserArea,
      Area,
      Rayon,
    ]),
    SharedModule,
    AuditModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService, QrCodeService, MaintenanceOverdueCron],
  exports: [AssetsService],
})
export class AssetsModule {}
