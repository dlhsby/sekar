import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PlantSeed } from './entities/plant-seed.entity';
import { SeedTransaction } from './entities/seed-transaction.entity';
import { CreateSeedDto } from './dto/create-seed.dto';
import { UpdateSeedDto } from './dto/update-seed.dto';
import { RecordTransactionDto } from './dto/record-transaction.dto';
import { ListSeedsQueryDto } from './dto/list-seeds-query.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';

@Injectable()
export class PlantSeedsService {
  constructor(
    @InjectRepository(PlantSeed)
    private readonly seedRepository: Repository<PlantSeed>,
    @InjectRepository(SeedTransaction)
    private readonly transactionRepository: Repository<SeedTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(params: ListSeedsQueryDto): Promise<{
    items: PlantSeed[];
    total: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    let query = this.seedRepository.createQueryBuilder('ps');

    if (params.search) {
      query = query.where('ps.nameId ILIKE :search', {
        search: `%${params.search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('ps.nameId', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async findOne(id: string): Promise<PlantSeed> {
    const seed = await this.seedRepository.findOne({ where: { id } });
    if (!seed) {
      throw new NotFoundException('Seed not found');
    }
    return seed;
  }

  async createSeed(dto: CreateSeedDto): Promise<PlantSeed> {
    const existing = await this.seedRepository.findOne({
      where: { nameId: dto.nameId },
    });
    if (existing) {
      throw new ConflictException('Seed with this name already exists');
    }

    const seed = this.seedRepository.create({
      nameId: dto.nameId,
      speciesId: dto.speciesId || null,
      unit: dto.unit,
      stockQty: dto.stockQty || 0,
    });

    return this.seedRepository.save(seed);
  }

  async updateSeed(id: string, dto: UpdateSeedDto): Promise<PlantSeed> {
    const seed = await this.seedRepository.findOne({ where: { id } });
    if (!seed) {
      throw new NotFoundException('Seed not found');
    }

    // Check for nameId uniqueness if it's being updated
    if (dto.nameId && dto.nameId !== seed.nameId) {
      const existing = await this.seedRepository.findOne({
        where: { nameId: dto.nameId },
      });
      if (existing) {
        throw new ConflictException('Seed with this name already exists');
      }
    }

    // Update only provided fields
    if (dto.nameId !== undefined) {
      seed.nameId = dto.nameId;
    }
    if (dto.speciesId !== undefined) {
      seed.speciesId = dto.speciesId;
    }
    if (dto.unit !== undefined) {
      seed.unit = dto.unit;
    }

    return this.seedRepository.save(seed);
  }

  async recordTransaction(
    dto: RecordTransactionDto,
    userId: string,
  ): Promise<{ transaction: SeedTransaction; seed: PlantSeed }> {
    if (dto.qty <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    return this.dataSource.transaction(async (tm) => {
      const seed = await tm
        .getRepository(PlantSeed)
        .createQueryBuilder('ps')
        .where('ps.id = :id', { id: dto.seedId })
        .setLock('pessimistic_write')
        .getOne();

      if (!seed) {
        throw new NotFoundException('Seed not found');
      }

      if (dto.transactionType === 'distribution') {
        if (seed.stockQty - dto.qty < 0) {
          throw new ConflictException('Insufficient stock for distribution');
        }
        seed.stockQty -= dto.qty;
      } else if (dto.transactionType === 'purchase' || dto.transactionType === 'adjustment') {
        seed.stockQty += dto.qty;
      }

      seed.lastCountedAt = new Date();
      await tm.save(seed);

      const transaction = tm.create(SeedTransaction, {
        seedId: dto.seedId,
        transactionType: dto.transactionType,
        qty: dto.qty,
        unitPrice: dto.unitPrice || null,
        supplier: dto.supplier || null,
        receiptUrl: dto.receiptUrl || null,
        toDistrictId: dto.toDistrictId || null,
        toAreaId: dto.toAreaId || null,
        recipientName: dto.recipientName || null,
        occurredAt: dto.occurredAt,
        recordedBy: userId,
        notes: dto.notes || null,
      });

      const saved = await tm.save(transaction);
      return { transaction: saved, seed };
    });
  }

  async getTransactions(
    seedId: string,
    params: ListTransactionsQueryDto,
  ): Promise<{ items: SeedTransaction[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const seed = await this.seedRepository.findOne({ where: { id: seedId } });
    if (!seed) {
      throw new NotFoundException('Seed not found');
    }

    let query = this.transactionRepository
      .createQueryBuilder('st')
      .where('st.seedId = :seedId', { seedId });

    if (params.type) {
      query = query.andWhere('st.transactionType = :type', {
        type: params.type,
      });
    }

    if (params.from) {
      query = query.andWhere('st.occurredAt >= :from', { from: params.from });
    }

    if (params.to) {
      query = query.andWhere('st.occurredAt <= :to', { to: params.to });
    }

    const [items, total] = await query
      .orderBy('st.occurredAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }
}
