import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { AreaStaffRequirement } from '../area-staff-requirements/entities/area-staff-requirement.entity';
import { DayType } from '../area-staff-requirements/entities/area-staff-requirement.entity';
import { UserTrackingStatus, TrackingStatus } from './entities/user-tracking-status.entity';
import { CityStatsDto } from './dto/city-stats.dto';
import { RayonStatsDto } from './dto/rayon-stats.dto';
import { AreaStatsDto } from './dto/area-stats.dto';
import { LiveUsersResponseDto, LiveUsersFilterDto } from './dto/live-users.dto';
import { LocationHistoryResponseDto } from './dto/location-history.dto';
import { UserDaySummaryDto } from './dto/user-day-summary.dto';
import {
  StaffingSummaryResponseDto,
  StaffingSummaryItemDto,
  RoleStaffingDto,
  DayTypeRequirementsDto,
} from './dto/staffing-summary.dto';
import { MonitoringStatsService } from './services/monitoring-stats.service';
import { MonitoringUserService } from './services/monitoring-user.service';
import { DayTypeService } from './services/day-type.service';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(AreaStaffRequirement)
    private readonly staffRequirementRepository: Repository<AreaStaffRequirement>,
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
    private readonly statsService: MonitoringStatsService,
    private readonly userService: MonitoringUserService,
    private readonly dayTypeService: DayTypeService,
  ) {}

  // ---- Delegated to MonitoringStatsService ----

  async getCityStats(): Promise<CityStatsDto> {
    return this.statsService.getCityStats();
  }

  async getRayonStats(rayonId: string): Promise<RayonStatsDto> {
    return this.statsService.getRayonStats(rayonId);
  }

  async getAreaStats(areaId: string): Promise<AreaStatsDto> {
    return this.statsService.getAreaStats(areaId);
  }

  // ---- Delegated to MonitoringUserService ----

  async getLiveUsers(filters?: LiveUsersFilterDto): Promise<LiveUsersResponseDto> {
    return this.userService.getLiveUsers(filters);
  }

  async getLocationHistory(
    userId: string,
    date: string,
    shiftId?: string,
  ): Promise<LocationHistoryResponseDto> {
    return this.userService.getLocationHistory(userId, date, shiftId);
  }

  async getUserDaySummary(userId: string): Promise<UserDaySummaryDto> {
    return this.userService.getUserDaySummary(userId);
  }

  // ---- Staffing Summary (combines user & stats concerns, stays here) ----

  async getStaffingSummary(filters: {
    rayon_id?: string;
    area_id?: string;
  }): Promise<StaffingSummaryResponseDto> {
    const areas = await this.resolveAreas(filters);
    const currentShift = await this.statsService.getCurrentShiftDefinition();
    const currentDayType = await this.dayTypeService.getCurrentDayType();
    const items: StaffingSummaryItemDto[] = [];

    for (const area of areas) {
      const item = await this.buildStaffingItem(area, currentShift, currentDayType);
      items.push(item);
    }

    return {
      items,
      current_day_type: currentDayType,
      current_day_type_label: this.dayTypeService.getDayTypeLabel(currentDayType),
      generated_at: new Date(),
    };
  }

  // ---- Private helpers ----

  private async resolveAreas(filters: { rayon_id?: string; area_id?: string }): Promise<Area[]> {
    if (filters.area_id) {
      const area = await this.areaRepository.findOne({
        where: { id: filters.area_id, is_active: true },
      });
      return area ? [area] : [];
    }

    const where: Record<string, any> = { is_active: true };
    if (filters.rayon_id) where.rayon_id = filters.rayon_id;

    return this.areaRepository.find({ where });
  }

  private async buildStaffingItem(
    area: Area,
    currentShift: ShiftDefinition | null,
    currentDayType: DayType,
  ): Promise<StaffingSummaryItemDto> {
    const roleCounts = await this.getTrackingRoleCounts(area.id);

    const requirements = currentShift
      ? await this.staffRequirementRepository.find({
          where: {
            area_id: area.id,
            shift_definition_id: currentShift.id,
            day_type: currentDayType,
          },
        })
      : [];

    const allRequirements = currentShift
      ? await this.staffRequirementRepository.find({
          where: { area_id: area.id, shift_definition_id: currentShift.id },
        })
      : [];

    const reqMap = new Map(requirements.map((r) => [r.role, r.required_count]));
    const assignedCounts = await this.getAssignedRoleCounts(area.id);

    const requirementsByDayType = this.buildRequirementsByDayType(allRequirements);

    const roles: RoleStaffingDto[] = this.buildRoleStaffing(
      roleCounts,
      assignedCounts,
      reqMap,
      requirementsByDayType,
    );

    const totals = this.sumRoleTotals(roles);

    return {
      id: area.id,
      name: area.name,
      type: 'area',
      roles,
      ...totals,
      is_fully_staffed: roles.every((r) => r.active + r.idle + r.outside_area >= r.total_required),
    };
  }

  private buildRequirementsByDayType(
    allRequirements: AreaStaffRequirement[],
  ): Map<string, DayTypeRequirementsDto> {
    const map = new Map<string, DayTypeRequirementsDto>();

    for (const req of allRequirements) {
      const existing = map.get(req.role) ?? { weekday: 0, weekend: 0, holiday: 0 };

      switch (req.day_type) {
        case DayType.WEEKDAY:
          existing.weekday = req.required_count;
          break;
        case DayType.WEEKEND:
          existing.weekend = req.required_count;
          break;
        case DayType.HOLIDAY:
          existing.holiday = req.required_count;
          break;
      }

      map.set(req.role, existing);
    }

    return map;
  }

  private async getTrackingRoleCounts(
    areaId: string,
  ): Promise<Map<string, Record<string, number>>> {
    const rows = await this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoin('uts.user', 'user')
      .select('user.role', 'role')
      .addSelect('uts.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('uts.area_id = :areaId', { areaId })
      .groupBy('user.role')
      .addGroupBy('uts.status')
      .getRawMany();

    const map = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const existing = map.get(row.role) || {};
      existing[row.status] = parseInt(row.count);
      map.set(row.role, existing);
    }
    return map;
  }

  private async getAssignedRoleCounts(areaId: string): Promise<Map<string, number>> {
    const rows = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('user.area_id = :areaId', { areaId })
      .andWhere('user.deleted_at IS NULL')
      .groupBy('user.role')
      .getRawMany();

    return new Map(rows.map((r: any) => [r.role, parseInt(r.count)]));
  }

  private buildRoleStaffing(
    roleCounts: Map<string, Record<string, number>>,
    assignedCounts: Map<string, number>,
    reqMap: Map<string, number>,
    requirementsByDayType: Map<string, DayTypeRequirementsDto>,
  ): RoleStaffingDto[] {
    const allRoles = new Set([...roleCounts.keys(), ...assignedCounts.keys(), ...reqMap.keys()]);

    return Array.from(allRoles).map((role) => {
      const statuses = roleCounts.get(role) || {};
      return {
        role,
        active: statuses[TrackingStatus.ACTIVE] || 0,
        idle: statuses[TrackingStatus.INACTIVE] || 0,
        outside_area: statuses[TrackingStatus.OUTSIDE_AREA] || 0,
        missing: statuses[TrackingStatus.MISSING] || 0,
        offline: statuses[TrackingStatus.OFFLINE] || 0,
        total_assigned: assignedCounts.get(role) || 0,
        total_required: reqMap.get(role) || 0,
        requirements_by_day_type: requirementsByDayType.get(role) ?? {
          weekday: 0,
          weekend: 0,
          holiday: 0,
        },
      };
    });
  }

  private sumRoleTotals(roles: RoleStaffingDto[]): {
    total_active: number;
    total_idle: number;
    total_outside_area: number;
    total_missing: number;
    total_offline: number;
  } {
    return {
      total_active: roles.reduce((s, r) => s + r.active, 0),
      total_idle: roles.reduce((s, r) => s + r.idle, 0),
      total_outside_area: roles.reduce((s, r) => s + r.outside_area, 0),
      total_missing: roles.reduce((s, r) => s + r.missing, 0),
      total_offline: roles.reduce((s, r) => s + r.offline, 0),
    };
  }
}
