import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamType } from './entities/team-type.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

/** TeamsModule (ADR-048) — teams + team-type catalog, gated by `team:*`. */
@Module({
  imports: [TypeOrmModule.forFeature([Team, TeamType])],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
