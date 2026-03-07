import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreasService } from './areas.service';
import { AreasController } from './areas.controller';
import { Area } from './entities/area.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AreaTypesModule } from '../area-types/area-types.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

/**
 * Areas Module
 *
 * Manages work locations where workers can be assigned.
 * Provides CRUD operations with GPS boundary management.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Area, User]),
    forwardRef(() => AuthModule),
    AreaTypesModule,
    forwardRef(() => MonitoringModule),
  ],
  controllers: [AreasController],
  providers: [AreasService],
  exports: [AreasService],
})
export class AreasModule {}
