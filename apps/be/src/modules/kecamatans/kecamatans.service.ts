import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kecamatan } from './entities/kecamatan.entity';

@Injectable()
export class KecamatansService {
  constructor(
    @InjectRepository(Kecamatan)
    private readonly repo: Repository<Kecamatan>,
  ) {}

  async findAll(rayonId?: string): Promise<Kecamatan[]> {
    const qb = this.repo
      .createQueryBuilder('k')
      .leftJoinAndSelect('k.rayon', 'rayon')
      .orderBy('k.name', 'ASC');
    if (rayonId) qb.where('k.rayon_id = :rayonId', { rayonId });
    return qb.getMany();
  }

  async findOne(id: string): Promise<Kecamatan> {
    const found = await this.repo.findOne({ where: { id }, relations: ['rayon'] });
    if (!found) throw new NotFoundException(`Kecamatan ${id} not found`);
    return found;
  }
}
