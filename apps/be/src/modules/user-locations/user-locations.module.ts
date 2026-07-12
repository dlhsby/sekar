import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLocationsController } from './user-locations.controller';
import { UserLocationsService } from './user-locations.service';
import { UserLocation } from './entities/user-location.entity';
import { Location } from '../locations/entities/location.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserLocation, Location, User])],
  controllers: [UserLocationsController],
  providers: [UserLocationsService],
  exports: [UserLocationsService],
})
export class UserLocationsModule {}
