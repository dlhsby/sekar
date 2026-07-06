import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { Shift } from './entities/shift.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { User } from '../users/entities/user.entity';
import { AreasModule } from '../areas/areas.module';
import { SharedModule } from '../../shared/shared.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { AuditModule } from '../audit/audit.module';
import { UserAreasModule } from '../user-areas/user-areas.module';
import { SchedulesModule } from '../schedules/schedules.module';

/**
 * Shifts Module
 *
 * Manages worker shifts including clock-in/out operations,
 * GPS recording, and selfie photo uploads to S3.
 * Phase 2C: GPS boundary validation removed, area auto-detection added.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, ShiftDefinition, User]),
    forwardRef(() => AreasModule),
    SharedModule,
    forwardRef(() => MonitoringModule),
    AuditModule,
    UserAreasModule,
    SchedulesModule,
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
