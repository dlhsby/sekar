import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantSpecies } from './entities/plant-species.entity';
import { AreaPlant } from './entities/area-plant.entity';
import { NotablePlant } from './entities/notable-plant.entity';
import { ActivityPlantItem } from './entities/activity-plant-item.entity';
import { Area } from '../areas/entities/area.entity';
import { PlantsController } from './plants.controller';
import { PlantsService } from './services/plants.service';
import { ActivityPlantItemsService } from './services/activity-plant-items.service';
import { PlantDueDateService } from './services/plant-due-date.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlantSpecies, AreaPlant, NotablePlant, ActivityPlantItem, Area])],
  controllers: [PlantsController],
  providers: [PlantsService, ActivityPlantItemsService, PlantDueDateService],
  exports: [TypeOrmModule, PlantsService, ActivityPlantItemsService, PlantDueDateService],
})
export class PlantsModule {}
