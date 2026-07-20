import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { Location } from '../../locations/entities/location.entity';
import { UserTrackingStatus } from '../entities/user-tracking-status.entity';
import { SchedulesService } from '../../schedules/schedules.service';
import { ReassignWorkerDto, ReassignWorkerResponseDto } from '../dto/reassign-worker.dto';
import { EventsGateway } from '../../../gateways/events.gateway';
import { AuditLogService } from '../../audit/audit.service';
import { TimezoneUtil } from '../../../common/utils/timezone.util';

const REASSIGNABLE_ROLES: string[] = [UserRole.SATGAS, UserRole.LINMAS];

@Injectable()
export class MonitoringReassignService {
  private readonly logger = new Logger(MonitoringReassignService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
    private readonly dailySchedulesService: SchedulesService,
    private readonly eventsGateway: EventsGateway,
    private readonly auditLogService: AuditLogService,
  ) {}

  async reassign(dto: ReassignWorkerDto, requestingUser: User): Promise<ReassignWorkerResponseDto> {
    const worker = await this.userRepository.findOne({
      where: { id: dto.user_id },
      relations: ['area'],
    });

    if (!worker) {
      throw new NotFoundException(`User ${dto.user_id} not found`);
    }

    if (!REASSIGNABLE_ROLES.includes(worker.role)) {
      throw new BadRequestException(`Cannot reassign user with role '${worker.role}'`);
    }

    const targetArea = await this.areaRepository.findOne({
      where: { id: dto.target_area_id },
    });

    if (!targetArea) {
      throw new NotFoundException(`Target area ${dto.target_area_id} not found`);
    }

    if (requestingUser.role === UserRole.KEPALA_RAYON) {
      const workerDistrictId = worker.area?.district_id ?? null;
      if (
        workerDistrictId !== requestingUser.district_id ||
        targetArea.district_id !== requestingUser.district_id
      ) {
        throw new ForbiddenException('You can only reassign workers within your own district');
      }
    }

    const previousAreaId = worker.location_id ?? null;
    const previousAreaName = worker.area?.name ?? null;
    // Default in WIB — a UTC date here is yesterday between 00:00-07:00 WIB
    const effectiveDate = dto.effective_date || TimezoneUtil.jakartaDateString();

    worker.location_id = dto.target_area_id;
    await this.userRepository.save(worker);

    await this.trackingRepository.update(
      { user_id: worker.id },
      { location_id: dto.target_area_id },
    );

    // Reflect the reassignment on the worker's roster for the effective day so
    // clock-in + monitoring pick up the new area (and optional shift) at once.
    // This replaces the legacy range-based `schedules` override: overwriting the
    // day's areas implicitly ends the previous day-assignment.
    const newScheduleId = await this.dailySchedulesService.overrideForDay(
      worker.id,
      effectiveDate,
      {
        locationId: dto.target_area_id,
        districtId: targetArea.district_id ?? null,
        shiftDefinitionId: dto.shift_definition_id ?? undefined,
      },
      requestingUser.id,
    );

    const now = new Date();

    this.eventsGateway.emitUserReassigned({
      user_id: worker.id,
      user_name: worker.full_name,
      role: worker.role as UserRole,
      previous_area_id: previousAreaId,
      previous_area_name: previousAreaName,
      new_area_id: targetArea.id,
      new_area_name: targetArea.name,
      district_id: targetArea.district_id ?? null,
      region_id: targetArea.region_id ?? null,
      timestamp: now,
    });

    this.logger.log(
      `User ${worker.id} reassigned from area ${previousAreaId} to ${dto.target_area_id}`,
    );

    this.auditLogService
      .log({
        entity_type: 'user',
        entity_id: worker.id,
        action: 'reassign',
        actor_id: requestingUser.id,
        old_value: { location_id: previousAreaId, location_name: previousAreaName },
        new_value: { location_id: targetArea.id, location_name: targetArea.name },
        metadata: {
          reason: dto.reason ?? null,
          effective_date: effectiveDate,
          new_schedule_id: newScheduleId,
        },
      })
      .catch((err: Error) => this.logger.error(`Audit log failed: ${err.message}`));

    return {
      user_id: worker.id,
      user_name: worker.full_name,
      previous_area_id: previousAreaId,
      previous_area_name: previousAreaName,
      new_area_id: targetArea.id,
      new_area_name: targetArea.name,
      new_schedule_id: newScheduleId,
      effective_date: effectiveDate,
      reassigned_at: now,
    };
  }
}
