import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { ScheduleScopeResolverService } from './services/schedule-scope-resolver.service';

/**
 * Lean module exposing {@link ScheduleScopeResolverService} to feature modules
 * (tasks, activities) that need to derive an assignment's scope from a user's
 * schedule occurrence. Kept separate from the full SchedulesModule so consumers
 * pull in only the Schedule repository + resolver, avoiding heavier coupling.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Schedule])],
  providers: [ScheduleScopeResolverService],
  exports: [ScheduleScopeResolverService],
})
export class ScheduleScopeModule {}
