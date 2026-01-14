import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreasService } from './areas.service';
import { AreasController } from './areas.controller';
import { Area } from './entities/area.entity';
import { AuthModule } from '../auth/auth.module';
import { AreaTypesModule } from '../area-types/area-types.module';

/**
 * Areas Module
 *
 * Manages work locations where workers can be assigned.
 * Provides CRUD operations with GPS boundary management.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Area]),
    forwardRef(() => AuthModule), // For JwtAuthGuard and RolesGuard (circular dependency)
    AreaTypesModule, // For validating area_type_id
    // WorkerAssignmentsModule will be imported via forwardRef when needed
  ],
  controllers: [AreasController],
  providers: [AreasService],
  exports: [AreasService], // Export for use in WorkerAssignments module
})
export class AreasModule {}
