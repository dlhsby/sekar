import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OvertimeController } from './overtime.controller';
import { OvertimeService } from './overtime.service';
import { Overtime } from './entities/overtime.entity';
import { OvertimeAktivitas } from './entities/overtime-aktivitas.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { User } from '../users/entities/user.entity';

/**
 * Overtime Module
 *
 * Provides functionality for overtime management including:
 * - Overtime submission with aktivitas (Satgas, Linmas)
 * - Overtime approval/rejection (Korlap)
 * - Activity type validation
 * - Area-scoped approvals
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Overtime,
      OvertimeAktivitas,
      ActivityType,
      User,
    ]),
  ],
  controllers: [OvertimeController],
  providers: [OvertimeService],
  exports: [OvertimeService],
})
export class OvertimeModule {}
