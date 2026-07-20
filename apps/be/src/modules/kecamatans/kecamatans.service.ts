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

  async findAll(districtId?: string): Promise<Kecamatan[]> {
    const qb = this.repo
      .createQueryBuilder('k')
      .leftJoinAndSelect('k.district', 'district')
      .orderBy('k.name', 'ASC');
    if (districtId) qb.where('k.district_id = :districtId', { districtId });
    return qb.getMany();
  }

  async findOne(id: string): Promise<Kecamatan> {
    const found = await this.repo.findOne({ where: { id }, relations: ['district'] });
    if (!found) throw new NotFoundException(`Kecamatan ${id} not found`);
    return found;
  }
}
