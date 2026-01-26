import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftDefinitionsController } from './shift-definitions.controller';
import { ShiftDefinitionsService } from './shift-definitions.service';
import { ShiftDefinition } from './entities/shift-definition.entity';

/**
 * Module for managing shift definitions (read-only)
 *
 * Provides read-only endpoints for shift definitions.
 * Exports ShiftDefinitionsService for use in other modules.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ShiftDefinition])],
  controllers: [ShiftDefinitionsController],
  providers: [ShiftDefinitionsService],
  exports: [ShiftDefinitionsService],
})
export class ShiftDefinitionsModule {}
