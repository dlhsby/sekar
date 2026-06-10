import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { CsvImportService } from './csv/csv-import.service';
import { Area } from '../areas/entities/area.entity';
import { UsersModule } from '../users/users.module';
import { AreasModule } from '../areas/areas.module';

/**
 * Module for importing data into SEKAR.
 *
 * - KMZ/KML area import (parse Placemarks, match + create/update areas)
 * - CSV bulk import for users and areas (validate → confirm, Redis-backed
 *   session), reusing the Users/Areas services for the actual inserts.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Area]), UsersModule, AreasModule],
  controllers: [ImportController],
  providers: [ImportService, CsvImportService],
  exports: [ImportService, CsvImportService],
})
export class ImportModule {}
