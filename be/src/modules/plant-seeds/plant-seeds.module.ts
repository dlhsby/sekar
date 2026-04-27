import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantSeed } from './entities/plant-seed.entity';
import { SeedTransaction } from './entities/seed-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlantSeed, SeedTransaction])],
  exports: [TypeOrmModule],
})
export class PlantSeedsModule {}
