import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAreasController } from './user-areas.controller';
import { UserAreasService } from './user-areas.service';
import { UserArea } from './entities/user-area.entity';
import { Area } from '../areas/entities/area.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserArea, Area, User])],
  controllers: [UserAreasController],
  providers: [UserAreasService],
  exports: [UserAreasService],
})
export class UserAreasModule {}
