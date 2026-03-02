import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Overtime, OvertimeStatus } from './entities/overtime.entity';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import { OvertimeFilterDto } from './dto/overtime-filter.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { OVERTIME_SUBMITTERS } from '../users/constants/role-groups';
import { ShiftsService } from '../shifts/shifts.service';

const ALLOWED_SORT_FIELDS: Record<string, string> = {
  created_at: 'overtime.created_at',
  start_datetime: 'overtime.start_datetime',
};

@Injectable()
export class OvertimeService {
  private readonly logger = new Logger(OvertimeService.name);

  constructor(
    @InjectRepository(Overtime)
    private overtimeRepo: Repository<Overtime>,
    @InjectRepository(ActivityType)
    private activityTypeRepo: Repository<ActivityType>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private shiftsService: ShiftsService,
  ) {}

  async submit(userId: string, userRole: UserRole, dto: CreateOvertimeDto): Promise<Overtime> {
    if (!OVERTIME_SUBMITTERS.includes(userRole as any)) {
      throw new ForbiddenException('Only overtime submitters can submit overtime');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const actType = await this.activityTypeRepo.findOne({
      where: { id: dto.activity_type_id, is_active: true },
    });
    if (!actType) {
      throw new BadRequestException(`Activity type ${dto.activity_type_id} not found`);
    }
    if (!actType.applicable_roles.includes(userRole)) {
      throw new ForbiddenException(`Activity type ${actType.name} is not available for your role`);
    }

    // Validate that end_datetime > start_datetime
    const startDt = new Date(dto.start_datetime);
    const endDt = new Date(dto.end_datetime);
    if (endDt <= startDt) {
      throw new BadRequestException('end_datetime must be after start_datetime');
    }

    const overtime = this.overtimeRepo.create({
      user_id: userId,
      area_id: (await this.shiftsService.getActiveArea(userId))?.id || user.area_id || undefined,
      start_datetime: startDt,
      end_datetime: endDt,
      status: OvertimeStatus.PENDING,
      activity_type_id: dto.activity_type_id,
      description: dto.description,
      photo_urls: dto.photo_urls,
      gps_lat: dto.gps_lat,
      gps_lng: dto.gps_lng,
    });

    const saved = await this.overtimeRepo.save(overtime);
    this.logger.log(`Overtime submitted by user ${userId}: ${saved.id}`);
    return saved;
  }

  async approve(overtimeId: string, approverId: string): Promise<Overtime> {
    const overtime = await this.findOneOrFail(overtimeId);
    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Only pending overtime can be approved');
    }

    if (overtime.user_id === approverId) {
      throw new ForbiddenException('Cannot approve your own overtime submission');
    }

    const approver = await this.userRepo.findOne({ where: { id: approverId } });
    if (!approver) throw new NotFoundException('Approver not found');

    this.validateApprovalHierarchy(overtime, approver);

    overtime.status = OvertimeStatus.APPROVED;
    overtime.approved_by = approverId;
    overtime.approved_at = new Date();

    const saved = await this.overtimeRepo.save(overtime);
    this.logger.log(`Overtime ${overtimeId} approved by ${approverId}`);
    return saved;
  }

  async reject(overtimeId: string, approverId: string, dto: RejectOvertimeDto): Promise<Overtime> {
    const overtime = await this.findOneOrFail(overtimeId);
    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Only pending overtime can be rejected');
    }

    if (overtime.user_id === approverId) {
      throw new ForbiddenException('Cannot reject your own overtime submission');
    }

    const approver = await this.userRepo.findOne({ where: { id: approverId } });
    if (!approver) throw new NotFoundException('Approver not found');

    this.validateApprovalHierarchy(overtime, approver);

    overtime.status = OvertimeStatus.REJECTED;
    overtime.approved_by = approverId;
    overtime.approved_at = new Date();
    overtime.rejection_reason = dto.reason;

    const saved = await this.overtimeRepo.save(overtime);
    this.logger.log(`Overtime ${overtimeId} rejected by ${approverId}`);
    return saved;
  }

  async findMyPaginated(
    userId: string,
    filters: OvertimeFilterDto,
  ): Promise<PaginatedResponseDto<Overtime>> {
    const qb = this.overtimeRepo
      .createQueryBuilder('overtime')
      .leftJoinAndSelect('overtime.activityType', 'activityType')
      .leftJoinAndSelect('overtime.area', 'area')
      .leftJoinAndSelect('overtime.approver', 'approver')
      .where('overtime.user_id = :userId', { userId });

    this.applyFilters(qb, filters);

    const orderField =
      ALLOWED_SORT_FIELDS[filters.sort_by ?? 'created_at'] ?? 'overtime.created_at';
    const sortDir = (filters.sort_dir?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    qb.orderBy(orderField, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findAllPaginated(
    requesterId: string,
    requesterRole: UserRole,
    filters: OvertimeFilterDto,
  ): Promise<PaginatedResponseDto<Overtime>> {
    const requester = await this.userRepo.findOne({ where: { id: requesterId } });

    const qb = this.overtimeRepo
      .createQueryBuilder('overtime')
      .leftJoinAndSelect('overtime.activityType', 'activityType')
      .leftJoinAndSelect('overtime.user', 'user')
      .leftJoinAndSelect('overtime.area', 'area')
      .leftJoinAndSelect('overtime.approver', 'approver');

    // Role-based scoping
    if (requesterRole === UserRole.KORLAP && requester?.area_id) {
      qb.andWhere('overtime.area_id = :areaId', { areaId: requester.area_id });
    } else if (requesterRole === UserRole.KEPALA_RAYON) {
      if (!requester?.rayon_id) {
        throw new ForbiddenException('Kepala Rayon account has no assigned rayon');
      }
      qb.andWhere('area.rayon_id = :rayonId', { rayonId: requester.rayon_id });
    } else if (requesterRole === UserRole.ADMIN_DATA) {
      if (!requester?.rayon_id) {
        throw new ForbiddenException('Admin Data account has no assigned rayon');
      }
      qb.andWhere('area.rayon_id = :rayonId', { rayonId: requester.rayon_id });
    }
    // ADMIN_SYSTEM, SUPERADMIN see all

    this.applyFilters(qb, filters);

    const orderField =
      ALLOWED_SORT_FIELDS[filters.sort_by ?? 'created_at'] ?? 'overtime.created_at';
    const sortDir = (filters.sort_dir?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    qb.orderBy(orderField, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(overtimeId: string): Promise<Overtime> {
    return this.findOneOrFail(overtimeId);
  }

  private validateApprovalHierarchy(overtime: Overtime, approver: User): void {
    if (!overtime.user) {
      throw new NotFoundException('Overtime submitter not found');
    }
    const submitterRole = overtime.user.role;

    if (approver.role === UserRole.KORLAP) {
      if (!['satgas', 'linmas'].includes(submitterRole)) {
        throw new ForbiddenException('Korlap can only approve overtime from satgas and linmas');
      }
      if (!approver.area_id || overtime.area_id !== approver.area_id) {
        throw new ForbiddenException('You can only approve overtime for your area');
      }
    } else if (approver.role === UserRole.KEPALA_RAYON) {
      if (!approver.rayon_id) {
        throw new ForbiddenException('Kepala Rayon account has no assigned rayon');
      }
      if (!['korlap', 'admin_data'].includes(submitterRole)) {
        throw new ForbiddenException(
          'Kepala Rayon can only approve overtime from korlap and admin_data',
        );
      }
      if (
        !overtime.area ||
        !overtime.area.rayon_id ||
        overtime.area.rayon_id !== approver.rayon_id
      ) {
        throw new ForbiddenException('You can only approve overtime for your rayon');
      }
    } else {
      throw new ForbiddenException('You do not have authority to approve overtime');
    }
  }

  private applyFilters(qb: any, filters: OvertimeFilterDto): void {
    if (filters.status) {
      qb.andWhere('overtime.status = :status', { status: filters.status });
    }

    if (filters.area_id) {
      qb.andWhere('overtime.area_id = :filterAreaId', { filterAreaId: filters.area_id });
    }

    if (filters.from_date) {
      qb.andWhere("DATE(overtime.start_datetime AT TIME ZONE 'Asia/Jakarta') >= :fromDate", {
        fromDate: filters.from_date,
      });
    }
    if (filters.to_date) {
      qb.andWhere("DATE(overtime.start_datetime AT TIME ZONE 'Asia/Jakarta') <= :toDate", {
        toDate: filters.to_date,
      });
    }
  }

  private async findOneOrFail(overtimeId: string): Promise<Overtime> {
    const overtime = await this.overtimeRepo.findOne({
      where: { id: overtimeId },
      relations: ['activityType', 'user', 'area', 'approver'],
    });
    if (!overtime) {
      throw new NotFoundException('Overtime not found');
    }
    return overtime;
  }
}
