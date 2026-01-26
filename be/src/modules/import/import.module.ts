import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { Area } from '../areas/entities/area.entity';

/**
 * Module for importing geographic data from KMZ/KML files
 *
 * Features:
 * - Parse KMZ (zipped KML) files
 * - Parse KML files directly
 * - Extract Placemarks (points and polygons)
 * - Match with existing areas
 * - Create or update areas in batch
 */
@Module({
  imports: [TypeOrmModule.forFeature([Area])],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
