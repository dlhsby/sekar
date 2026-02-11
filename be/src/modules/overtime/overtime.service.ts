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
import { OvertimeAktivitas } from './entities/overtime-aktivitas.entity';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { OVERTIME_SUBMITTERS } from '../users/constants/role-groups';

/**
 * Overtime Service
 *
 * Handles business logic for overtime submission and approval.
 * Satgas and Linmas submit overtime with aktivitas.
 * Korlap approves/rejects overtime within their area.
 */
@Injectable()
export class OvertimeService {
  private readonly logger = new Logger(OvertimeService.name);

  constructor(
    @InjectRepository(Overtime)
    private overtimeRepo: Repository<Overtime>,
    @InjectRepository(OvertimeAktivitas)
    private overtimeAktivitasRepo: Repository<OvertimeAktivitas>,
    @InjectRepository(ActivityType)
    private activityTypeRepo: Repository<ActivityType>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Submit overtime request
   *
   * @param userId User UUID (satgas or linmas)
   * @param userRole User role
   * @param dto Overtime creation data
   * @returns Created overtime with aktivitas
   */
  async submit(
    userId: string,
    userRole: UserRole,
    dto: CreateOvertimeDto,
  ): Promise<Overtime> {
    // Validate role
    if (!OVERTIME_SUBMITTERS.includes(userRole as any)) {
      throw new ForbiddenException(
        'Only satgas and linmas can submit overtime',
      );
    }

    // Get user to find area
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Validate each aktivitas's activity_type matches user's role
    for (const akt of dto.aktivitas) {
      const actType = await this.activityTypeRepo.findOne({
        where: { id: akt.activity_type_id, is_active: true },
      });
      if (!actType) {
        throw new BadRequestException(
          `Activity type ${akt.activity_type_id} not found`,
        );
      }
      if (!actType.applicable_roles.includes(userRole)) {
        throw new ForbiddenException(
          `Activity type ${actType.name} is not available for your role`,
        );
      }
    }

    // Create overtime with nested aktivitas
    const overtime = this.overtimeRepo.create({
      user_id: userId,
      area_id: user.area_id || undefined,
      date: dto.date,
      start_time: dto.start_time,
      end_time: dto.end_time,
      notes: dto.notes,
      status: OvertimeStatus.PENDING,
      aktivitas: dto.aktivitas.map((akt) =>
        this.overtimeAktivitasRepo.create({
          activity_type_id: akt.activity_type_id,
          description: akt.description,
          photo_urls: akt.photo_urls,
          gps_lat: akt.gps_lat,
          gps_lng: akt.gps_lng,
        }),
      ),
    });

    const saved = await this.overtimeRepo.save(overtime);
    this.logger.log(`Overtime submitted by user ${userId}: ${saved.id}`);
    return saved;
  }

  /**
   * Approve overtime request
   *
   * @param overtimeId Overtime UUID
   * @param approverId Korlap UUID
   * @param approverRole Korlap role
   * @returns Updated overtime
   */
  async approve(
    overtimeId: string,
    approverId: string,
    approverRole: UserRole,
  ): Promise<Overtime> {
    if (approverRole !== UserRole.KORLAP) {
      throw new ForbiddenException('Only korlap can approve overtime');
    }

    const overtime = await this.findOneOrFail(overtimeId);
    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Only pending overtime can be approved');
    }

    // Scope check: korlap can only approve for their area
    const approver = await this.userRepo.findOne({ where: { id: approverId } });
    if (
      approver?.area_id &&
      overtime.area_id &&
      approver.area_id !== overtime.area_id
    ) {
      throw new ForbiddenException(
        'You can only approve overtime for your area',
      );
    }

    overtime.status = OvertimeStatus.APPROVED;
    overtime.approved_by = approverId;
    overtime.approved_at = new Date();

    const saved = await this.overtimeRepo.save(overtime);
    this.logger.log(`Overtime ${overtimeId} approved by ${approverId}`);
    return saved;
  }

  /**
   * Reject overtime request
   *
   * @param overtimeId Overtime UUID
   * @param approverId Korlap UUID
   * @param approverRole Korlap role
   * @param dto Rejection reason
   * @returns Updated overtime
   */
  async reject(
    overtimeId: string,
    approverId: string,
    approverRole: UserRole,
    dto: RejectOvertimeDto,
  ): Promise<Overtime> {
    if (approverRole !== UserRole.KORLAP) {
      throw new ForbiddenException('Only korlap can reject overtime');
    }

    const overtime = await this.findOneOrFail(overtimeId);
    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Only pending overtime can be rejected');
    }

    // Scope check: korlap can only reject for their area
    const approver = await this.userRepo.findOne({ where: { id: approverId } });
    if (
      approver?.area_id &&
      overtime.area_id &&
      approver.area_id !== overtime.area_id
    ) {
      throw new ForbiddenException(
        'You can only reject overtime for your area',
      );
    }

    overtime.status = OvertimeStatus.REJECTED;
    overtime.approved_by = approverId;
    overtime.approved_at = new Date();
    overtime.rejection_reason = dto.reason;

    const saved = await this.overtimeRepo.save(overtime);
    this.logger.log(`Overtime ${overtimeId} rejected by ${approverId}`);
    return saved;
  }

  /**
   * Find user's own overtime submissions
   *
   * @param userId User UUID
   * @returns List of overtime submissions
   */
  async findMy(userId: string): Promise<Overtime[]> {
    return this.overtimeRepo.find({
      where: { user_id: userId },
      relations: ['aktivitas', 'aktivitas.activity_type', 'area'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find pending overtime for approval
   * Korlap sees only their area
   *
   * @param approverId Korlap UUID
   * @param approverRole Korlap role
   * @returns List of pending overtime
   */
  async findPending(
    approverId: string,
    approverRole: UserRole,
  ): Promise<Overtime[]> {
    const approver = await this.userRepo.findOne({ where: { id: approverId } });

    const qb = this.overtimeRepo
      .createQueryBuilder('overtime')
      .leftJoinAndSelect('overtime.aktivitas', 'aktivitas')
      .leftJoinAndSelect('aktivitas.activity_type', 'activityType')
      .leftJoinAndSelect('overtime.user', 'user')
      .leftJoinAndSelect('overtime.area', 'area')
      .where('overtime.status = :status', { status: OvertimeStatus.PENDING });

    // Scope: korlap sees only their area
    if (approverRole === UserRole.KORLAP && approver?.area_id) {
      qb.andWhere('overtime.area_id = :areaId', { areaId: approver.area_id });
    }

    qb.orderBy('overtime.created_at', 'DESC');
    return qb.getMany();
  }

  /**
   * Find overtime by ID
   *
   * @param overtimeId Overtime UUID
   * @returns Overtime details
   */
  async findOne(overtimeId: string): Promise<Overtime> {
    return this.findOneOrFail(overtimeId);
  }

  /**
   * Internal helper to find overtime or throw NotFoundException
   */
  private async findOneOrFail(overtimeId: string): Promise<Overtime> {
    const overtime = await this.overtimeRepo.findOne({
      where: { id: overtimeId },
      relations: [
        'aktivitas',
        'aktivitas.activity_type',
        'user',
        'area',
        'approver',
      ],
    });
    if (!overtime) {
      throw new NotFoundException('Overtime not found');
    }
    return overtime;
  }
}
