import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamType } from './entities/team-type.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreateTeamTypeDto, UpdateTeamTypeDto } from './dto/team-type.dto';

/** Teams (crews) + team-type catalog master data (ADR-048). */
@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamType)
    private readonly typeRepo: Repository<TeamType>,
  ) {}

  // ── Teams ────────────────────────────────────────────────────────────────
  findAll(): Promise<Team[]> {
    return this.teamRepo.find({ relations: ['team_type'], order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.teamRepo.findOne({ where: { id }, relations: ['team_type'] });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async create(dto: CreateTeamDto): Promise<Team> {
    await this.assertTypeExists(dto.team_type_id);
    await this.assertNameFree(dto.name);
    const saved = await this.teamRepo.save(this.teamRepo.create(dto));
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);
    if (dto.team_type_id && dto.team_type_id !== team.team_type_id) {
      await this.assertTypeExists(dto.team_type_id);
    }
    if (dto.name && dto.name !== team.name) {
      await this.assertNameFree(dto.name, id);
    }
    Object.assign(team, dto);
    await this.teamRepo.save(team);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const team = await this.findOne(id);
    await this.teamRepo.softRemove(team);
  }

  // ── Team types (catalog) ──────────────────────────────────────────────────
  /** Active types by default (form dropdowns must not offer deactivated
   * types); pass includeInactive for catalog-management views. */
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

  private async assertTypeExists(id: string): Promise<void> {
    const type = await this.typeRepo.findOne({ where: { id, is_active: true } });
    if (!type) throw new BadRequestException('Team type not found or inactive');
  }

  /** Team names are unique (case-insensitive) — they identify crews on the map. */
  private async assertNameFree(name: string, excludeId?: string): Promise<void> {
    const qb = this.teamRepo
      .createQueryBuilder('team')
      .where('LOWER(team.name) = LOWER(:name)', { name });
    if (excludeId) qb.andWhere('team.id != :excludeId', { excludeId });
    if (await qb.getExists()) {
      throw new ConflictException(`A team named '${name}' already exists`);
    }
  }
}
