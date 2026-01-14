import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../../modules/users/entities/user.entity';
import { AreaType } from '../../modules/area-types/entities/area-type.entity';
import { Area } from '../../modules/areas/entities/area.entity';
import { WorkerAssignment } from '../../modules/worker-assignments/entities/worker-assignment.entity';
import { Shift } from '../../modules/shifts/entities/shift.entity';
import { Report } from '../../modules/reports/entities/report.entity';
import { LocationLog } from '../../modules/location/entities/location-log.entity';
import { AuthModule } from '../../modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AreaType, Area, WorkerAssignment, Shift, Report, LocationLog]),
    AuthModule,
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
