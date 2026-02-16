import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { Schedule } from './entities/schedule.entity';
import { UsersModule } from '../users/users.module';
import { AreasModule } from '../areas/areas.module';
import { ShiftDefinitionsModule } from '../shift-definitions/shift-definitions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule]),
    forwardRef(() => UsersModule),
    forwardRef(() => AreasModule),
    ShiftDefinitionsModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
