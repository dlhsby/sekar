import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { Shift } from './entities/shift.entity';
import { AreasModule } from '../areas/areas.module';
import { WorkerAssignmentsModule } from '../worker-assignments/worker-assignments.module';
import { SharedModule } from '../../shared/shared.module';

/**
 * Shifts Module
 *
 * Manages worker shifts including clock-in/out operations,
 * GPS validation, and selfie photo uploads to S3.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Shift]),
    forwardRef(() => AreasModule),
    forwardRef(() => WorkerAssignmentsModule),
    SharedModule,
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
