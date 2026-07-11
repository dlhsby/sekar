import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Overtime, OvertimeStatus } from './entities/overtime.entity';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { StartOvertimeDto } from './dto/start-overtime.dto';
import { EndOvertimeDto } from './dto/end-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import { OvertimeFilterDto } from './dto/overtime-filter.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { OVERTIME_SUBMITTERS, CLOCKABLE_ROLES } from '../users/constants/role-groups';
import { ShiftsService } from '../shifts/shifts.service';
import { ClockInDto } from '../shifts/dto/clock-in.dto';
import { ClockOutDto } from '../shifts/dto/clock-out.dto';
import { AuditLogService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

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
    private readonly auditLogService: AuditLogService,
    // Phase 4-3 (M2): overtime approve/reject FCM notifications. Optional
    // so legacy specs that don't provide NotificationsService keep working —
    // the prod app wires it via OvertimeModule import.
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  private notifyOvertimeDecision(
    overtimeId: string,
    userId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): void {
    if (!this.notificationsService) return;
    const isApproved = decision === 'approved';
    this.notificationsService
      .sendToUser({
        user_id: userId,
        title: isApproved ? 'Lembur disetujui' : 'Lembur ditolak',
        body: isApproved
          ? 'Pengajuan lembur Anda telah disetujui.'
          : `Pengajuan lembur Anda ditolak${reason ? `: ${reason}` : '.'}`,
        type: isApproved ? NotificationType.OVERTIME_APPROVED : NotificationType.OVERTIME_REJECTED,
        data: { overtime_id: overtimeId, ...(reason ? { reason } : {}) },
      })
      .catch((err) =>
        this.logger.error(
          `Failed to enqueue overtime ${decision} notification for ${userId}: ${err.message}`,
        ),
      );
  }

  async startOvertime(dto: StartOvertimeDto, user: User): Promise<Overtime> {
    if (!CLOCKABLE_ROLES.includes(user.role as any)) {
      throw new ForbiddenException('Your role cannot start overtime');
    }

    // Check no active normal shift
    const activeShift = await this.shiftsService.findActiveShift(user.id);
    if (activeShift && !activeShift.is_overtime) {
      throw new BadRequestException('Must end normal shift before starting overtime');
    }

    // Check no active overtime
    const activeOvertime = await this.overtimeRepo.findOne({
      where: { user_id: user.id, status: OvertimeStatus.IN_PROGRESS },
    });
    if (activeOvertime) {
      throw new BadRequestException('Already have active overtime');
    }

    // Create overtime record
    const overtime = this.overtimeRepo.create({
      user_id: user.id,
      area_id: (await this.shiftsService.getActiveArea(user.id))?.id || user.area_id || undefined,
      start_datetime: new Date(),
      end_datetime: null,
      status: OvertimeStatus.IN_PROGRESS,
      activity_type_id: null,
      reason: dto.reason,
      description: null,
      photo_urls: [],
      gps_lat: dto.gps_lat,
      gps_lng: dto.gps_lng,
    });

    const savedOvertime = await this.overtimeRepo.save(overtime);

    // Clock in via shifts service
    const clockInDto: ClockInDto = {
      gps_lat: dto.gps_lat,
      gps_lng: dto.gps_lng,
      selfie_photo: dto.selfie_photo,
    };
    const shift = await this.shiftsService.clockIn(user.id, clockInDto, true);

    // Link shift to overtime
    savedOvertime.shift_id = shift.id;
    await this.overtimeRepo.save(savedOvertime);

    this.logger.log(`Overtime started by user ${user.id}: ${savedOvertime.id}`);

    this.auditLogService
      .log({
        entity_type: 'overtime',
        entity_id: savedOvertime.id,
        action: 'start',
        actor_id: user.id,
        new_value: { status: OvertimeStatus.IN_PROGRESS, shift_id: savedOvertime.shift_id },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return savedOvertime;
  }

  async endOvertime(dto: EndOvertimeDto, user: User): Promise<Overtime> {
    const overtime = await this.overtimeRepo.findOne({
      where: { user_id: user.id, status: OvertimeStatus.IN_PROGRESS },
      relations: ['activityType', 'user', 'area'],
    });

    if (!overtime) {
      throw new NotFoundException('No active overtime found');
    }

    // Validate activity type
    const actType = await this.activityTypeRepo.findOne({
      where: { id: dto.activity_type_id, is_active: true },
    });
    if (!actType) {
      throw new BadRequestException('Activity type not found');
    }
    if (!actType.applicable_roles.includes(user.role)) {
      throw new ForbiddenException(`Activity type ${actType.name} is not available for your role`);
    }

    // Clock out the overtime shift
    if (overtime.shift_id) {
      const clockOutDto: ClockOutDto = {
        gps_lat: dto.gps_lat,
        gps_lng: dto.gps_lng,
        selfie_photo: dto.selfie_photo,
      };
      await this.shiftsService.clockOut(user.id, clockOutDto);
    }

    // Update overtime record
    overtime.end_datetime = new Date();
    overtime.status = OvertimeStatus.PENDING;
    overtime.activity_type_id = dto.activity_type_id;
    overtime.description = dto.description;
    overtime.photo_urls = dto.photo_urls;

    const saved = await this.overtimeRepo.save(overtime);
    this.logger.log(`Overtime ended by user ${user.id}: ${overtime.id}`);

    this.auditLogService
      .log({
        entity_type: 'overtime',
        entity_id: overtime.id,
        action: 'end',
        actor_id: user.id,
        old_value: { status: OvertimeStatus.IN_PROGRESS },
        new_value: { status: OvertimeStatus.PENDING, activity_type_id: dto.activity_type_id },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return saved;
  }

  async getActiveOvertime(userId: string): Promise<Overtime | null> {
    return this.overtimeRepo.findOne({
      where: { user_id: userId, status: OvertimeStatus.IN_PROGRESS },
      relations: ['activityType', 'area', 'shift'],
    });
  }

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

    this.auditLogService
      .log({
        entity_type: 'overtime',
        entity_id: overtimeId,
        action: 'approve',
        actor_id: approverId,
        old_value: { status: OvertimeStatus.PENDING },
        new_value: { status: OvertimeStatus.APPROVED, approved_by: approverId },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    // Phase 4-3 (M2): notify the overtime submitter
    this.notifyOvertimeDecision(overtimeId, overtime.user_id, 'approved');

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

    this.auditLogService
      .log({
        entity_type: 'overtime',
        entity_id: overtimeId,
        action: 'reject',
        actor_id: approverId,
        old_value: { status: OvertimeStatus.PENDING },
        new_value: { status: OvertimeStatus.REJECTED, rejection_reason: dto.reason },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    // Phase 4-3 (M2): notify the overtime submitter with the rejection reason
    this.notifyOvertimeDecision(overtimeId, overtime.user_id, 'rejected', dto.reason);

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
    } else if (requesterRole === UserRole.ADMIN_RAYON) {
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
      if (!['korlap', 'admin_rayon'].includes(submitterRole)) {
        throw new ForbiddenException(
          'Kepala Rayon can only approve overtime from korlap and admin_rayon',
        );
      }
      if (
        !overtime.area ||
        !overtime.area.rayon_id ||
        overtime.area.rayon_id !== approver.rayon_id
      ) {
        throw new ForbiddenException('You can only approve overtime for your rayon');
      }
    } else if (approver.role === UserRole.MANAGEMENT) {
      if (submitterRole !== 'kepala_rayon') {
        throw new ForbiddenException('Top management can only approve overtime from kepala_rayon');
      }
      // No area/rayon scope check — management has city-wide visibility
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
      relations: ['activityType', 'user', 'area', 'approver', 'shift'],
    });
    if (!overtime) {
      throw new NotFoundException('Overtime not found');
    }
    return overtime;
  }

  async update(overtimeId: string, dto: UpdateOvertimeDto): Promise<Overtime> {
    const overtime = await this.findOneOrFail(overtimeId);

    // Validate dates if provided
    if (dto.start_datetime || dto.end_datetime) {
      const startDt = dto.start_datetime ? new Date(dto.start_datetime) : overtime.start_datetime;
      const endDt = dto.end_datetime ? new Date(dto.end_datetime) : overtime.end_datetime;

      if (endDt && endDt <= startDt) {
        throw new BadRequestException('end_datetime must be after start_datetime');
      }

      // Update dates
      if (dto.start_datetime) {
        overtime.start_datetime = startDt;
      }
      if (dto.end_datetime) {
        overtime.end_datetime = endDt;
      }
    }

    // Validate activity type if provided
    if (dto.activity_type_id && overtime.activity_type_id !== dto.activity_type_id) {
      const actType = await this.activityTypeRepo.findOne({
        where: { id: dto.activity_type_id, is_active: true },
      });
      if (!actType) {
        throw new BadRequestException(`Activity type ${dto.activity_type_id} not found`);
      }
      overtime.activity_type_id = dto.activity_type_id;
    }

    // Update optional fields
    if (dto.description !== undefined) {
      overtime.description = dto.description;
    }
    if (dto.photo_urls !== undefined) {
      overtime.photo_urls = dto.photo_urls;
    }
    if (dto.gps_lat !== undefined) {
      overtime.gps_lat = dto.gps_lat;
    }
    if (dto.gps_lng !== undefined) {
      overtime.gps_lng = dto.gps_lng;
    }

    const saved = await this.overtimeRepo.save(overtime);
    this.logger.log(`Overtime ${overtimeId} updated`);

    this.auditLogService
      .log({
        entity_type: 'overtime',
        entity_id: overtimeId,
        action: 'update',
        actor_id: 'system',
        new_value: {
          start_datetime: saved.start_datetime,
          end_datetime: saved.end_datetime,
          activity_type_id: saved.activity_type_id,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return saved;
  }

  async remove(overtimeId: string): Promise<void> {
    const overtime = await this.findOneOrFail(overtimeId);
    await this.overtimeRepo.remove(overtime);
    this.logger.log(`Overtime ${overtimeId} deleted`);

    this.auditLogService
      .log({
        entity_type: 'overtime',
        entity_id: overtimeId,
        action: 'delete',
        actor_id: 'system',
        old_value: { id: overtimeId, status: overtime.status },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));
  }
}
