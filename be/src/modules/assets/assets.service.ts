import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, IsNull } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { AssetCategory } from './entities/asset-category.entity';
import { AssetAssignment } from './entities/asset-assignment.entity';
import { AssetMaintenance } from './entities/asset-maintenance.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserArea } from '../user-areas/entities/user-area.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { CheckoutAssetDto } from './dto/checkout-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import {
  AssetStatus,
  AssetCondition,
  MaintenanceStatus,
  MaintenanceType,
} from './enums/asset.enums';
import { QrCodeService } from './services/qr-code.service';
import { AuditLogService } from '../audit/audit.service';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { Area } from '../areas/entities/area.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { ASSET_MANAGERS, ASSET_USERS, ASSET_VIEWERS } from '../users/constants/role-groups';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
    @InjectRepository(AssetCategory)
    private categoryRepo: Repository<AssetCategory>,
    @InjectRepository(AssetAssignment)
    private assignmentRepo: Repository<AssetAssignment>,
    @InjectRepository(AssetMaintenance)
    private maintenanceRepo: Repository<AssetMaintenance>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserArea)
    private userAreaRepo: Repository<UserArea>,
    @InjectRepository(Area)
    private areaRepo: Repository<Area>,
    @InjectRepository(Rayon)
    private rayonRepo: Repository<Rayon>,
    private qrCodeService: QrCodeService,
    private auditLogService: AuditLogService,
  ) {}

  async findCategories(): Promise<AssetCategory[]> {
    return this.categoryRepo.find({ order: { sort_order: 'ASC' } });
  }

  async findAll(user: User, query: QueryAssetDto): Promise<PaginatedResponseDto<Asset>> {
    const qb = this.assetRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category');

    await this.applyScopeFilter(qb, user);

    if (query.category_id) {
      qb.andWhere('asset.category_id = :categoryId', { categoryId: query.category_id });
    }
    if (query.status) {
      qb.andWhere('asset.status = :status', { status: query.status });
    }
    if (query.area_id) {
      qb.andWhere('asset.area_id = :areaId', { areaId: query.area_id });
    }
    if (query.rayon_id) {
      qb.andWhere('asset.rayon_id = :rayonId', { rayonId: query.rayon_id });
    }
    if (query.search) {
      qb.andWhere(
        '(LOWER(asset.name) LIKE LOWER(:search) OR LOWER(asset.description) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    qb.andWhere('asset.deleted_at IS NULL');

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string, user: User): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['category', 'assignments', 'maintenances'],
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    await this.authorizeViewAsset(asset, user);

    if (asset.qr_code_url) {
      asset.qr_code_url = await this.qrCodeService.presignedUrl(asset.qr_code_url);
    }
    if (asset.photo_url) {
      asset.photo_url = await this.qrCodeService.presignedUrl(asset.photo_url);
    }

    return asset;
  }

  async create(dto: CreateAssetDto, user: User): Promise<Asset> {
    if (!ASSET_MANAGERS.includes(user.role as any)) {
      throw new ForbiddenException('Only asset managers can create assets');
    }

    const category = await this.categoryRepo.findOne({ where: { id: dto.category_id } });
    if (!category) {
      throw new BadRequestException('Invalid category id');
    }

    const rayonId = dto.rayon_id || (dto.area_id ? await this.getAreaRayon(dto.area_id) : null);
    if (!rayonId) {
      throw new BadRequestException('Asset must have either area_id or rayon_id');
    }

    const assetCode = await this.generateAssetCode(category.code_prefix, rayonId);

    const asset = this.assetRepo.create({
      category_id: dto.category_id,
      area_id: dto.area_id || null,
      rayon_id: rayonId,
      name: dto.name,
      description: dto.description || null,
      asset_code: assetCode,
      purchase_date: dto.purchase_date || null,
      purchase_price: dto.purchase_price || null,
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
    });

    const saved = await this.assetRepo.save(asset);

    const qrKey = await this.qrCodeService.generate(assetCode);
    saved.qr_code_url = qrKey;
    await this.assetRepo.save(saved);

    await this.auditLogService.log({
      entity_type: 'asset',
      entity_id: saved.id,
      action: 'created',
      actor_id: user.id,
      new_value: { asset_code: assetCode, category_id: dto.category_id, name: dto.name },
    });

    this.logger.log(`Asset created: ${assetCode} by ${user.id}`);
    return saved;
  }

  async update(id: string, dto: UpdateAssetDto, user: User): Promise<Asset> {
    if (!ASSET_MANAGERS.includes(user.role as any)) {
      throw new ForbiddenException('Only asset managers can update assets');
    }

    const asset = await this.assetRepo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    await this.authorizeViewAsset(asset, user);

    const oldValue = { ...asset };

    if (dto.status) {
      if (
        dto.status === AssetStatus.RETIRED &&
        !['admin_system', 'superadmin'].includes(user.role)
      ) {
        throw new ForbiddenException('Only admin_system/superadmin can retire assets');
      }
      if (dto.status === AssetStatus.LOST && !ASSET_MANAGERS.includes(user.role as any)) {
        throw new ForbiddenException('Only asset managers can mark assets lost');
      }
      this.validateTransition(asset.status, dto.status, user.role);
      asset.status = dto.status;
    }

    if (dto.condition) {
      asset.condition = dto.condition;
    }
    if (dto.name) {
      asset.name = dto.name;
    }
    if (dto.description !== undefined) {
      asset.description = dto.description;
    }
    if (dto.purchase_date !== undefined) {
      asset.purchase_date = dto.purchase_date;
    }
    if (dto.purchase_price !== undefined) {
      asset.purchase_price = dto.purchase_price;
    }

    const updated = await this.assetRepo.save(asset);

    await this.auditLogService.log({
      entity_type: 'asset',
      entity_id: id,
      action: 'updated',
      actor_id: user.id,
      old_value: oldValue,
      new_value: asset,
    });

    return updated;
  }

  async softDelete(id: string, user: User): Promise<void> {
    if (!ASSET_MANAGERS.includes(user.role as any)) {
      throw new ForbiddenException('Only asset managers can delete assets');
    }

    const asset = await this.assetRepo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // softRemove (not softDelete) so the AuditSubscriber can stamp deleted_by.
    await this.assetRepo.softRemove(asset);

    await this.auditLogService.log({
      entity_type: 'asset',
      entity_id: id,
      action: 'deleted',
      actor_id: user.id,
      old_value: { asset_code: asset.asset_code, status: asset.status },
    });
  }

  async generateQr(id: string, user: User): Promise<string> {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    await this.authorizeViewAsset(asset, user);

    const qrKey = await this.qrCodeService.generate(asset.asset_code);
    asset.qr_code_url = qrKey;
    await this.assetRepo.save(asset);

    return this.qrCodeService.presignedUrl(qrKey);
  }

  async generateBulkQr(
    ids: string[],
    user: User,
  ): Promise<{ assetId: string; assetCode: string; qrCodeUrl: string }[]> {
    if (ids.length > 50) {
      throw new BadRequestException('Maximum 50 assets per bulk QR generation');
    }

    const assets = await this.assetRepo.findBy({ id: In(ids) });
    const results = [];

    for (const asset of assets) {
      // Scope-checked per asset inside generateQr — a manager cannot bulk-print
      // QRs for assets outside their area/rayon.
      const qrCodeUrl = await this.generateQr(asset.id, user);
      results.push({
        assetId: asset.id,
        assetCode: asset.asset_code,
        qrCodeUrl,
      });
    }

    return results;
  }

  async scanByCode(code: string, user: User): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { asset_code: code, deleted_at: IsNull() },
      relations: ['category'],
    });

    if (!asset) {
      throw new NotFoundException('Asset code not found');
    }
    await this.authorizeViewAsset(asset, user);

    if (asset.qr_code_url) {
      asset.qr_code_url = await this.qrCodeService.presignedUrl(asset.qr_code_url);
    }
    if (asset.photo_url) {
      asset.photo_url = await this.qrCodeService.presignedUrl(asset.photo_url);
    }

    return asset;
  }

  async checkout(id: string, dto: CheckoutAssetDto, user: User): Promise<AssetAssignment> {
    if (!ASSET_USERS.includes(user.role as any)) {
      throw new ForbiddenException('Your role cannot checkout assets');
    }

    const asset = await this.assetRepo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    await this.authorizeViewAsset(asset, user);

    if (asset.status !== AssetStatus.AVAILABLE) {
      throw new BadRequestException('Asset is not available for checkout');
    }

    const assignedTo = dto.assigned_to || user.id;
    const queryRunner = this.assetRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const assignment = this.assignmentRepo.create({
        asset_id: id,
        assigned_to: assignedTo,
        assigned_by: user.id,
        condition_at_checkout: dto.condition_at_checkout,
        expected_return_at: dto.expected_return_at ? new Date(dto.expected_return_at) : null,
        notes: dto.notes || null,
      });
      const saved = await queryRunner.manager.save(assignment);

      asset.status = AssetStatus.IN_USE;
      await queryRunner.manager.save(asset);

      await this.auditLogService.log({
        entity_type: 'asset_assignment',
        entity_id: saved.id,
        action: 'created',
        actor_id: user.id,
        new_value: {
          asset_id: id,
          assigned_to: assignedTo,
          condition: dto.condition_at_checkout,
        },
      });

      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async returnAsset(id: string, dto: ReturnAssetDto, user: User): Promise<AssetAssignment> {
    if (!ASSET_USERS.includes(user.role as any)) {
      throw new ForbiddenException('Your role cannot return assets');
    }

    const asset = await this.assetRepo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    await this.authorizeViewAsset(asset, user);

    const assignment = await this.assignmentRepo.findOne({
      where: { asset_id: id, returned_at: IsNull() },
    });
    if (!assignment) {
      throw new BadRequestException('No active assignment found for this asset');
    }

    const queryRunner = this.assetRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      assignment.returned_at = new Date();
      assignment.returned_to = user.id;
      assignment.condition_at_return = dto.condition_at_return;
      if (dto.notes) {
        assignment.notes = dto.notes;
      }

      const updated = await queryRunner.manager.save(assignment);

      if (dto.condition_at_return === AssetCondition.UNUSABLE) {
        asset.status = AssetStatus.MAINTENANCE;
      } else {
        asset.status = AssetStatus.AVAILABLE;
      }
      asset.condition = dto.condition_at_return;
      await queryRunner.manager.save(asset);

      await this.auditLogService.log({
        entity_type: 'asset_assignment',
        entity_id: assignment.id,
        action: 'returned',
        actor_id: user.id,
        new_value: {
          returned_at: assignment.returned_at,
          condition_at_return: dto.condition_at_return,
        },
      });

      await queryRunner.commitTransaction();
      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async listAssignments(id: string, user: User): Promise<AssetAssignment[]> {
    const asset = await this.assetRepo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    await this.authorizeViewAsset(asset, user);

    return this.assignmentRepo.find({
      where: { asset_id: id },
      relations: ['assignedTo', 'assignedBy', 'returnedTo'],
      order: { checked_out_at: 'DESC' },
    });
  }

  async myAssets(user: User): Promise<AssetAssignment[]> {
    return this.assignmentRepo.find({
      where: { assigned_to: user.id, returned_at: IsNull() },
      relations: ['asset', 'asset.category'],
      order: { checked_out_at: 'DESC' },
    });
  }

  async createMaintenance(
    id: string,
    dto: CreateMaintenanceDto,
    user: User,
  ): Promise<AssetMaintenance> {
    if (!ASSET_MANAGERS.includes(user.role as any)) {
      throw new ForbiddenException('Only asset managers can create maintenance');
    }

    const asset = await this.assetRepo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const queryRunner = this.assetRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wasInUse = asset.status === AssetStatus.IN_USE;
      asset.status = AssetStatus.MAINTENANCE;
      await queryRunner.manager.save(asset);

      if (wasInUse) {
        const assignment = await queryRunner.manager.findOne(AssetAssignment, {
          where: { asset_id: id, returned_at: IsNull() },
        });
        if (assignment) {
          assignment.returned_at = new Date();
          assignment.returned_to = user.id;
          await queryRunner.manager.save(assignment);
        }
      }

      const maintenance = this.maintenanceRepo.create({
        asset_id: id,
        maintenance_type: dto.maintenance_type,
        scheduled_at: new Date(dto.scheduled_at),
        description: dto.description || null,
        cost: dto.cost || null,
        status: MaintenanceStatus.SCHEDULED,
      });
      const saved = await queryRunner.manager.save(maintenance);

      await this.auditLogService.log({
        entity_type: 'asset_maintenance',
        entity_id: saved.id,
        action: 'created',
        actor_id: user.id,
        new_value: { asset_id: id, maintenance_type: dto.maintenance_type },
      });

      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateMaintenance(
    id: string,
    dto: UpdateMaintenanceDto,
    user: User,
  ): Promise<AssetMaintenance> {
    if (!ASSET_MANAGERS.includes(user.role as any)) {
      throw new ForbiddenException('Only asset managers can update maintenance');
    }

    const maintenance = await this.maintenanceRepo.findOne({ where: { id } });
    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    const asset = await this.assetRepo.findOne({ where: { id: maintenance.asset_id } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    maintenance.status = dto.status;
    if (dto.completed_at) {
      maintenance.completed_at = new Date(dto.completed_at);
    }
    if (dto.notes !== undefined) {
      maintenance.notes = dto.notes;
    }
    if (dto.cost !== undefined) {
      maintenance.cost = dto.cost;
    }
    if (dto.condition) {
      maintenance.status = MaintenanceStatus.COMPLETED;
      asset.condition = dto.condition;
      asset.status = AssetStatus.AVAILABLE;
      asset.last_maintenance_at = new Date();
      asset.next_maintenance_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await this.assetRepo.save(asset);
    }

    const updated = await this.maintenanceRepo.save(maintenance);

    await this.auditLogService.log({
      entity_type: 'asset_maintenance',
      entity_id: id,
      action: 'updated',
      actor_id: user.id,
      new_value: { status: dto.status, completed_at: dto.completed_at },
    });

    return updated;
  }

  async maintenanceCalendar(
    query: { month: number; year: number },
    user: User,
  ): Promise<AssetMaintenance[]> {
    const startDate = new Date(query.year, query.month - 1, 1);
    const endDate = new Date(query.year, query.month, 0, 23, 59, 59);

    const qb = this.maintenanceRepo
      .createQueryBuilder('maintenance')
      .leftJoinAndSelect('maintenance.asset', 'asset')
      .leftJoinAndSelect('asset.category', 'category')
      .where('maintenance.scheduled_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });

    await this.applyScopeFilterForMaintenance(qb, user);

    return qb.orderBy('maintenance.scheduled_at', 'ASC').getMany();
  }

  async overdueMaintenance(user: User): Promise<AssetMaintenance[]> {
    const qb = this.maintenanceRepo
      .createQueryBuilder('maintenance')
      .leftJoinAndSelect('maintenance.asset', 'asset')
      .leftJoinAndSelect('asset.category', 'category')
      .where('maintenance.status = :status', { status: MaintenanceStatus.OVERDUE });

    await this.applyScopeFilterForMaintenance(qb, user);

    return qb.orderBy('maintenance.scheduled_at', 'DESC').getMany();
  }

  private validateTransition(
    currentStatus: AssetStatus,
    newStatus: AssetStatus,
    userRole: string,
  ): void {
    const validTransitions: Record<AssetStatus, AssetStatus[]> = {
      [AssetStatus.AVAILABLE]: [
        AssetStatus.IN_USE,
        AssetStatus.MAINTENANCE,
        AssetStatus.RETIRED,
        AssetStatus.LOST,
      ],
      [AssetStatus.IN_USE]: [
        AssetStatus.AVAILABLE,
        AssetStatus.MAINTENANCE,
        AssetStatus.RETIRED,
        AssetStatus.LOST,
      ],
      [AssetStatus.MAINTENANCE]: [AssetStatus.AVAILABLE, AssetStatus.RETIRED, AssetStatus.LOST],
      [AssetStatus.RETIRED]: [],
      [AssetStatus.LOST]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private async applyScopeFilter(qb: any, user: User): Promise<void> {
    const { role, area_id, rayon_id } = user;

    if (ASSET_VIEWERS.includes(role as any)) {
      if (role === UserRole.SATGAS || role === UserRole.LINMAS) {
        qb.andWhere('asset.area_id = :areaId', { areaId: area_id });
      } else if (role === UserRole.KORLAP) {
        const areas = await this.userAreaRepo.find({ where: { user_id: user.id } });
        const areaIds = areas.map((a) => a.area_id);
        if (areaIds.length > 0) {
          qb.andWhere('asset.area_id IN (:...areaIds)', { areaIds });
        }
      } else if (role === UserRole.ADMIN_DATA) {
        qb.andWhere('asset.area_id = :areaId', { areaId: area_id });
      } else if (role === UserRole.KEPALA_RAYON) {
        qb.andWhere('asset.rayon_id = :rayonId', { rayonId: rayon_id });
      }
    }
  }

  private async applyScopeFilterForMaintenance(qb: any, user: User): Promise<void> {
    const { role, area_id, rayon_id } = user;

    if (ASSET_VIEWERS.includes(role as any)) {
      if (role === UserRole.SATGAS || role === UserRole.LINMAS) {
        qb.andWhere('asset.area_id = :areaId', { areaId: area_id });
      } else if (role === UserRole.KORLAP) {
        const areas = await this.userAreaRepo.find({ where: { user_id: user.id } });
        const areaIds = areas.map((a) => a.area_id);
        if (areaIds.length > 0) {
          qb.andWhere('asset.area_id IN (:...areaIds)', { areaIds });
        }
      } else if (role === UserRole.ADMIN_DATA) {
        qb.andWhere('asset.area_id = :areaId', { areaId: area_id });
      } else if (role === UserRole.KEPALA_RAYON) {
        qb.andWhere('asset.rayon_id = :rayonId', { rayonId: rayon_id });
      }
    }
  }

  private async authorizeViewAsset(asset: Asset, user: User): Promise<void> {
    if (!ASSET_VIEWERS.includes(user.role as any)) {
      throw new ForbiddenException('You do not have permission to view this asset');
    }

    const { role, area_id, rayon_id } = user;
    if (role === UserRole.SATGAS || role === UserRole.LINMAS) {
      if (asset.area_id && area_id && asset.area_id !== area_id) {
        throw new ForbiddenException('You can only view assets in your area');
      }
    } else if (role === UserRole.KORLAP) {
      const areas = await this.userAreaRepo.find({ where: { user_id: user.id } });
      const areaIds = areas.map((a) => a.area_id);
      if (asset.area_id && !areaIds.includes(asset.area_id)) {
        throw new ForbiddenException('You can only view assets in your assigned areas');
      }
    } else if (role === UserRole.ADMIN_DATA) {
      if (asset.area_id && area_id && asset.area_id !== area_id) {
        throw new ForbiddenException('You can only view assets in your area');
      }
    } else if (role === UserRole.KEPALA_RAYON) {
      if (asset.rayon_id && rayon_id && asset.rayon_id !== rayon_id) {
        throw new ForbiddenException('You can only view assets in your rayon');
      }
    }
  }

  private async getAreaRayon(areaId: string): Promise<string> {
    const area = await this.areaRepo.findOne({ where: { id: areaId } });
    if (!area || !area.rayon_id) {
      throw new BadRequestException('Area does not have associated rayon');
    }
    return area.rayon_id;
  }

  private async generateAssetCode(prefix: string, rayonId: string): Promise<string> {
    const rayon = await this.rayonRepo.findOne({ where: { id: rayonId } });
    if (!rayon) {
      throw new BadRequestException('Invalid rayon id');
    }

    const lastAsset = await this.assetRepo.findOne({
      where: { category: { code_prefix: prefix }, rayon_id: rayonId },
      order: { asset_code: 'DESC' },
    });

    let seq = 1;
    if (lastAsset) {
      const match = lastAsset.asset_code.match(/-(\d{3})$/);
      if (match) {
        seq = parseInt(match[1], 10) + 1;
      }
    }

    const seqStr = seq.toString().padStart(3, '0');
    const rayonCode = rayon.code;
    return `${prefix}-${rayonCode}-${seqStr}`;
  }
}
