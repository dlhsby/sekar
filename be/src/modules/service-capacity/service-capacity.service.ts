import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ServiceCapacity } from './entities/service-capacity.entity';

@Injectable()
export class ServiceCapacityService {
  constructor(
    @InjectRepository(ServiceCapacity)
    private readonly repository: Repository<ServiceCapacity>,
    private readonly dataSource: DataSource,
  ) {}

  async findCalendar(params: {
    rayonId: string;
    year: number;
    fromWeek?: number;
    toWeek?: number;
    serviceType?: string;
  }): Promise<ServiceCapacity[]> {
    const { rayonId, year, fromWeek, toWeek, serviceType } = params;

    const query = this.repository
      .createQueryBuilder('sc')
      .where('sc.rayonId = :rayonId', { rayonId })
      .andWhere('sc.year = :year', { year });

    if (fromWeek) {
      query.andWhere('sc.isoWeek >= :fromWeek', { fromWeek });
    }
    if (toWeek) {
      query.andWhere('sc.isoWeek <= :toWeek', { toWeek });
    }
    if (serviceType) {
      query.andWhere('sc.serviceType = :serviceType', { serviceType });
    }

    const results = await query.orderBy('sc.isoWeek', 'ASC').getMany();

    // Fill missing weeks with placeholders if fromWeek/toWeek specified
    if (fromWeek && toWeek) {
      const resultMap = new Map(results.map((r) => [`${r.isoWeek}:${r.serviceType}`, r]));
      const filled: ServiceCapacity[] = [];
      const serviceTypes = serviceType
        ? [serviceType]
        : [...new Set(results.map((r) => r.serviceType))];
      if (serviceTypes.length === 0) {
        serviceTypes.push('default');
      }

      for (let w = fromWeek; w <= toWeek; w++) {
        for (const st of serviceTypes) {
          const key = `${w}:${st}`;
          const existing = resultMap.get(key);
          if (existing) {
            filled.push(existing);
          } else {
            const placeholder = new ServiceCapacity();
            placeholder.rayonId = rayonId;
            placeholder.year = year;
            placeholder.isoWeek = w;
            placeholder.serviceType = st;
            placeholder.capacityUnits = 0;
            placeholder.bookedUnits = 0;
            filled.push(placeholder);
          }
        }
      }
      return filled;
    }

    return results;
  }

  async upsertCapacity(params: {
    rayonId: string;
    year: number;
    isoWeek: number;
    serviceType: string;
    capacityUnits: number;
  }): Promise<ServiceCapacity> {
    const { rayonId, year, isoWeek, serviceType, capacityUnits } = params;

    let capacity = await this.repository.findOne({
      where: { rayonId, year, isoWeek, serviceType },
    });

    if (!capacity) {
      capacity = this.repository.create({
        rayonId,
        year,
        isoWeek,
        serviceType,
        capacityUnits,
        bookedUnits: 0,
      });
    } else {
      capacity.capacityUnits = capacityUnits;
    }

    return this.repository.save(capacity);
  }

  async bookAtomic(params: {
    rayonId: string;
    year: number;
    isoWeek: number;
    serviceType: string;
    units: number;
  }): Promise<ServiceCapacity> {
    const { rayonId, year, isoWeek, serviceType, units } = params;

    return this.dataSource.transaction(async (tm) => {
      // Use the entity-aware QB so column-name mapping (rayonId → rayon_id, etc.)
      // is loaded from metadata. The previous from()/getOne() form returned raw
      // rows TypeORM couldn't hydrate, so the lookup always missed.
      const capacity = await tm
        .createQueryBuilder(ServiceCapacity, 'sc')
        .where('sc.rayonId = :rayonId', { rayonId })
        .andWhere('sc.year = :year', { year })
        .andWhere('sc.isoWeek = :isoWeek', { isoWeek })
        .andWhere('sc.serviceType = :serviceType', { serviceType })
        .setLock('pessimistic_write')
        .getOne();

      if (!capacity) {
        throw new ConflictException('Capacity record not found or capacity is 0');
      }

      if (capacity.capacityUnits === 0) {
        throw new ConflictException('Capacity exceeded');
      }

      if (capacity.bookedUnits + units > capacity.capacityUnits) {
        throw new ConflictException('Capacity exceeded');
      }

      capacity.bookedUnits += units;
      return tm.save(capacity);
    });
  }

  async releaseAtomic(params: {
    rayonId: string;
    year: number;
    isoWeek: number;
    serviceType: string;
    units: number;
  }): Promise<ServiceCapacity> {
    const { rayonId, year, isoWeek, serviceType, units } = params;

    return this.dataSource.transaction(async (tm) => {
      const capacity = await tm
        .createQueryBuilder(ServiceCapacity, 'sc')
        .where('sc.rayonId = :rayonId', { rayonId })
        .andWhere('sc.year = :year', { year })
        .andWhere('sc.isoWeek = :isoWeek', { isoWeek })
        .andWhere('sc.serviceType = :serviceType', { serviceType })
        .setLock('pessimistic_write')
        .getOne();

      if (!capacity) {
        throw new ConflictException('Capacity record not found');
      }

      capacity.bookedUnits = Math.max(0, capacity.bookedUnits - units);
      return tm.save(capacity);
    });
  }
}
