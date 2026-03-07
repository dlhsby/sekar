import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { UserTrackingStatus } from '../entities/user-tracking-status.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { ReassignWorkerDto, ReassignWorkerResponseDto } from '../dto/reassign-worker.dto';
import { EventsGateway } from '../../../gateways/events.gateway';

const REASSIGNABLE_ROLES: string[] = [
  UserRole.SATGAS,
  UserRole.LINMAS,
];

@Injectable()
export class MonitoringReassignService {
  private readonly logger = new Logger(MonitoringReassignService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async reassign(
    dto: ReassignWorkerDto,
    requestingUser: User,
  ): Promise<ReassignWorkerResponseDto> {
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
      const workerRayonId = worker.area?.rayon_id ?? null;
      if (
        workerRayonId !== requestingUser.rayon_id ||
        targetArea.rayon_id !== requestingUser.rayon_id
      ) {
        throw new ForbiddenException('You can only reassign workers within your own rayon');
      }
    }

    const previousAreaId = worker.area_id ?? null;
    const previousAreaName = worker.area?.name ?? null;
    const effectiveDate = dto.effective_date || new Date().toISOString().split('T')[0];

    worker.area_id = dto.target_area_id;
    await this.userRepository.save(worker);

    await this.trackingRepository.update(
      { user_id: worker.id },
      { area_id: dto.target_area_id },
    );

    // End current schedule if requested
    if (dto.end_current_schedule && previousAreaId) {
      await this.endCurrentSchedules(worker.id, previousAreaId, effectiveDate);
    }

    // Create new schedule if shift_definition_id provided
    let newScheduleId: string | null = null;
    if (dto.shift_definition_id) {
      const schedule = this.scheduleRepository.create({
        user_id: worker.id,
        area_id: dto.target_area_id,
        shift_definition_id: dto.shift_definition_id,
        effective_date: new Date(effectiveDate),
        created_by: requestingUser.id,
      });
      const saved = await this.scheduleRepository.save(schedule);
      newScheduleId = saved.id;
    }

    const now = new Date();

    this.eventsGateway.emitUserReassigned({
      user_id: worker.id,
      user_name: worker.full_name,
      role: worker.role as UserRole,
      previous_area_id: previousAreaId,
      previous_area_name: previousAreaName,
      new_area_id: targetArea.id,
      new_area_name: targetArea.name,
      rayon_id: targetArea.rayon_id ?? null,
      timestamp: now,
    });

    this.logger.log(`User ${worker.id} reassigned from area ${previousAreaId} to ${dto.target_area_id}`);

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

  private async endCurrentSchedules(
    userId: string,
    areaId: string,
    effectiveDate: string,
  ): Promise<void> {
    const activeSchedules = await this.scheduleRepository.find({
      where: {
        user_id: userId,
        area_id: areaId,
        end_date: IsNull(),
      },
    });

    for (const schedule of activeSchedules) {
      schedule.end_date = new Date(effectiveDate);
      await this.scheduleRepository.save(schedule);
    }

    if (activeSchedules.length > 0) {
      this.logger.log(`Ended ${activeSchedules.length} active schedule(s) for user ${userId} at area ${areaId}`);
    }
  }
}
