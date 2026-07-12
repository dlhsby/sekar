import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantSpecies } from './entities/plant-species.entity';
import { LocationPlant } from './entities/location-plant.entity';
import { NotablePlant } from './entities/notable-plant.entity';
import { ActivityPlantItem } from './entities/activity-plant-item.entity';
import { Location } from '../locations/entities/location.entity';
import { PlantsController } from './plants.controller';
import { PlantsService } from './services/plants.service';
import { ActivityPlantItemsService } from './services/activity-plant-items.service';
import { PlantDueDateService } from './services/plant-due-date.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlantSpecies,
      LocationPlant,
      NotablePlant,
      ActivityPlantItem,
      Location,
    ]),
  ],
  controllers: [PlantsController],
  providers: [PlantsService, ActivityPlantItemsService, PlantDueDateService],
  exports: [TypeOrmModule, PlantsService, ActivityPlantItemsService, PlantDueDateService],
})
export class PlantsModule {}
