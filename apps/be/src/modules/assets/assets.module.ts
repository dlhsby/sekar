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
import { UserLocation } from '../user-locations/entities/user-location.entity';
import { Location } from '../locations/entities/location.entity';
import { District } from '../districts/entities/district.entity';
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
      UserLocation,
      Location,
      District,
    ]),
    SharedModule,
    AuditModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService, QrCodeService, MaintenanceOverdueCron],
  exports: [AssetsService],
})
export class AssetsModule {}
