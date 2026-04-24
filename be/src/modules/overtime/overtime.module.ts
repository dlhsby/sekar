import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OvertimeController } from './overtime.controller';
import { OvertimeService } from './overtime.service';
import { Overtime } from './entities/overtime.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { User } from '../users/entities/user.entity';
import { ShiftsModule } from '../shifts/shifts.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Overtime Module
 *
 * Provides functionality for overtime management including:
 * - Overtime submission with activity (Satgas, Linmas)
 * - Overtime approval/rejection (Korlap)
 * - Activity type validation
 * - Area-scoped approvals
 */
@Module({
  imports: [TypeOrmModule.forFeature([Overtime, ActivityType, User]), ShiftsModule, AuditModule],
  controllers: [OvertimeController],
  providers: [OvertimeService],
  exports: [OvertimeService],
})
export class OvertimeModule {}
