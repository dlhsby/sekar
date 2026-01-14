import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaTypesService } from './area-types.service';
import { AreaTypesController } from './area-types.controller';
import { AreaType } from './entities/area-type.entity';
import { AuthModule } from '../auth/auth.module';

/**
 * AreaTypes Module
 *
 * Provides area type management functionality (read-only for MVP).
 * AreaTypes are master data that categorize work areas into types
 * like park, pedestrian zone, mini garden, and street.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AreaType]),
    forwardRef(() => AuthModule), // For JwtAuthGuard (circular dependency)
  ],
  controllers: [AreaTypesController],
  providers: [AreaTypesService],
  exports: [AreaTypesService], // Export for use in Areas module
})
export class AreaTypesModule {}
