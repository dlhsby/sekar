import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamCategory } from './entities/team-category.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

/** TeamsModule (ADR-048) — teams + team-category catalog, gated by `team:*`. */
@Module({
  imports: [TypeOrmModule.forFeature([TeamCategory])],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
