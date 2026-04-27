import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantSpecies } from './entities/plant-species.entity';
import { AreaPlant } from './entities/area-plant.entity';
import { NotablePlant } from './entities/notable-plant.entity';
import { ActivityPlantItem } from './entities/activity-plant-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlantSpecies, AreaPlant, NotablePlant, ActivityPlantItem])],
  exports: [TypeOrmModule],
})
export class PlantsModule {}
