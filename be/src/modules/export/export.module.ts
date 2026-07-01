import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '../../shared/shared.module';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { Task } from '../tasks/entities/task.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Overtime } from '../overtime/entities/overtime.entity';
import { ExportJob } from './entities/export-job.entity';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

/**
 * Data export module (Phase 4-5). Reads the seven core entities, serializes to
 * CSV/XLSX/KMZ, and tracks large exports as async jobs in `export_jobs`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ExportJob, User, Area, Rayon, Task, Activity, Overtime]),
    SharedModule,
  ],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
