import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantSeed } from './entities/plant-seed.entity';
import { SeedTransaction } from './entities/seed-transaction.entity';
import { PlantSeedsService } from './plant-seeds.service';
import { PlantSeedsController } from './plant-seeds.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlantSeed, SeedTransaction])],
  controllers: [PlantSeedsController],
  providers: [PlantSeedsService],
  exports: [PlantSeedsService, TypeOrmModule],
})
export class PlantSeedsModule {}
