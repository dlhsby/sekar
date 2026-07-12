import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamType } from './entities/team-type.entity';
import { CreateTeamTypeDto, UpdateTeamTypeDto } from './dto/team-type.dto';

/**
 * Team types — crew-type catalog (ADR-048, Phase 4).
 * Concrete teams (name, PIC, members) are managed via schedule_events, not here.
 */
@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(TeamType)
    private readonly typeRepo: Repository<TeamType>,
  ) {}

  /**
   * List team types. Active types by default (form dropdowns must not offer
   * deactivated types); pass includeInactive for catalog-management views.
   */
  listTypes(includeInactive = false): Promise<TeamType[]> {
    return this.typeRepo.find({
      where: includeInactive ? {} : { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async createType(dto: CreateTeamTypeDto): Promise<TeamType> {
    try {
      return await this.typeRepo.save(this.typeRepo.create(dto));
    } catch (err) {
      // uq_team_types_name — surface a friendly conflict, not a 500.
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(`Team type '${dto.name}' already exists`);
      }
      throw err;
    }
  }

  async updateType(id: string, dto: UpdateTeamTypeDto): Promise<TeamType> {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Team type not found');
    Object.assign(type, dto);
    return this.typeRepo.save(type);
  }
}
