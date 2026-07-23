import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { ScheduleEvent } from '../entities/schedule-event.entity';
import { ScheduleEventMember } from '../entities/schedule-event-member.entity';
import { Schedule } from '../entities/schedule.entity';
import { User } from '../../users/entities/user.entity';
import { Location } from '../../locations/entities/location.entity';
import { Region } from '../../regions/entities/region.entity';
import { District } from '../../districts/entities/district.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import { TeamCategory } from '../../teams/entities/team-category.entity';
import { CreateScheduleEventDto } from '../dto/create-schedule-event.dto';
import { UpdateScheduleEventDto } from '../dto/update-schedule-event.dto';
import { EditScope } from '../enums/edit-scope.enum';
import { ScheduleScope } from '../enums/schedule-scope.enum';
import { RecurrenceType } from '../enums/recurrence-type.enum';
import { ScheduleMaterializerService } from './schedule-materializer.service';
import { AuditLogService } from '../../audit/audit.service';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { ScheduleRecurrenceUtil } from '../utils/schedule-recurrence.util';
import { MONITORING_CITY } from '../../users/constants/role-groups';

/**
 * Service for ScheduleEvent CRUD and materialization orchestration.
 * Handles validation, district/region scoping, and edit semantics (series/this-and-future).
 */
@Injectable()
export class ScheduleEventsService {
  private readonly logger = new Logger(ScheduleEventsService.name);

  constructor(
    @InjectRepository(ScheduleEvent)
    private readonly eventRepo: Repository<ScheduleEvent>,
    @InjectRepository(ScheduleEventMember)
    private readonly memberRepo: Repository<ScheduleEventMember>,
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(Region)
    private readonly regionRepo: Repository<Region>,
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
    @InjectRepository(ShiftDefinition)
    private readonly shiftRepo: Repository<ShiftDefinition>,
    @InjectRepository(TeamCategory)
    private readonly teamCategoryRepo: Repository<TeamCategory>,
    private readonly materializer: ScheduleMaterializerService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * List schedule events with optional filters.
   * Non-city roles are forced to their own district scope.
   */
  async list(
    filters: {
      from?: string;
      to?: string;
      district_id?: string;
      user_id?: string;
      team_category_id?: string;
      shift_definition_id?: string;
      is_team?: boolean;
    },
    actor: User,
  ): Promise<ScheduleEvent[]> {
    let query = this.eventRepo
      .createQueryBuilder('se')
      .leftJoinAndSelect('se.shift_definition', 'sd')
      .leftJoinAndSelect('se.location', 'l')
      .leftJoinAndSelect('se.region', 'r')
      .leftJoinAndSelect('se.team_category', 'tt')
      .leftJoinAndSelect('se.pic_user', 'pic')
      .leftJoinAndSelect('se.user', 'u')
      .leftJoinAndSelect('se.members', 'm')
      .where('se.deleted_at IS NULL');

    // District scoping for non-city roles
    if (!MONITORING_CITY.includes(actor.role)) {
      if (!actor.district_id) {
        throw new ForbiddenException('Your account is missing a district assignment');
      }
      query = query.andWhere(
        '(se.scope = :static AND l.district_id = :district) OR (se.scope = :mobile AND r.district_id = :district) OR (se.scope = :districtScope AND se.district_id = :district) OR se.scope = :cityScope',
        {
          static: ScheduleScope.STATIC,
          mobile: ScheduleScope.MOBILE,
          districtScope: ScheduleScope.RAYON,
          cityScope: ScheduleScope.CITY,
          district: actor.district_id,
        },
      );
    }

    // Date-range intersection: an event overlaps [from, to] iff it starts on
    // or before `to` AND ends on or after `from` (open-ended = no end).
    if (filters.to) {
      query = query.andWhere('se.start_date <= :rangeTo', { rangeTo: filters.to });
    }
    if (filters.from) {
      query = query.andWhere('(se.end_date >= :rangeFrom OR se.end_date IS NULL)', {
        rangeFrom: filters.from,
      });
    }
    if (filters.district_id) {
      query = query.andWhere(
        '(se.scope = :static AND l.district_id = :districtId) OR (se.scope = :mobile AND r.district_id = :districtId) OR (se.scope = :districtScope AND se.district_id = :districtId) OR se.scope = :cityScope',
        {
          static: ScheduleScope.STATIC,
          mobile: ScheduleScope.MOBILE,
          districtScope: ScheduleScope.RAYON,
          cityScope: ScheduleScope.CITY,
          districtId: filters.district_id,
        },
      );
    }
    if (filters.user_id) {
      query = query.andWhere('se.user_id = :userId', { userId: filters.user_id });
    }
    if (filters.team_category_id) {
      query = query.andWhere('se.team_category_id = :teamCategoryId', {
        teamCategoryId: filters.team_category_id,
      });
    }
    if (filters.shift_definition_id) {
      query = query.andWhere('se.shift_definition_id = :shiftId', {
        shiftId: filters.shift_definition_id,
      });
    }
    if (filters.is_team !== undefined) {
      query = query.andWhere('se.is_team = :isTeam', { isTeam: filters.is_team });
    }

    return query.orderBy('se.start_date', 'ASC').getMany();
  }

  /**
   * Get a single event by id.
   */
  async findOne(id: string, actor: User): Promise<ScheduleEvent> {
    const event = await this.eventRepo.findOne({
      where: { id, deleted_at: IsNull() },
      relations: [
        'shift_definition',
        'location',
        'region',
        'district',
        'team_category',
        'pic_user',
        'user',
        'members',
      ],
    });
    if (!event) throw new NotFoundException('Schedule event not found');

    // District scope check
    if (!MONITORING_CITY.includes(actor.role)) {
      if (!actor.district_id) {
        throw new ForbiddenException('Your account is missing a district assignment');
      }
      // City-wide events cover every district, so they're visible to all.
      if (event.scope !== ScheduleScope.CITY) {
        const eventDistrictId =
          event.scope === ScheduleScope.STATIC
            ? event.location?.district_id
            : event.scope === ScheduleScope.MOBILE
              ? event.region?.district_id
              : event.district_id;
        if (eventDistrictId !== actor.district_id) {
          throw new ForbiddenException('This event is outside your district');
        }
      }
    }

    return event;
  }

  /**
   * Create a new schedule event.
   * Validates scope/location/region coherency, shift existence, user eligibility.
   * Materializes occurrences immediately.
   */
  async create(
    dto: CreateScheduleEventDto,
    actor: User,
  ): Promise<{ event: ScheduleEvent; materialization: any }> {
    // Shape/scope/recurrence validation shared with the update paths.
    await this.validateEventShape(
      {
        shift_definition_id: dto.shift_definition_id,
        scope: dto.scope,
        location_id: dto.location_id ?? null,
        region_id: dto.region_id ?? null,
        district_id: dto.district_id ?? null,
        start_date: dto.start_date,
        end_date: dto.end_date ?? null,
        recurrence_type: dto.recurrence_type,
        recurrence_config: dto.recurrence_config ?? null,
      },
      actor,
    );

    // Validate kind (individual vs team) — immutable after create.
    if (dto.is_team) {
      if (!dto.team_category_id || !dto.pic_user_id) {
        throw new BadRequestException('Team events require team_category_id and pic_user_id');
      }
      if (dto.user_id) {
        throw new BadRequestException('Team events must not have user_id');
      }
      // Validate team category exists and is active
      await this.assertTeamCategoryExists(dto.team_category_id);
      // Validate PIC and members have eligible roles
      await this.validateUserRoles([dto.pic_user_id, ...(dto.member_ids || [])]);
    } else {
      if (!dto.user_id) {
        throw new BadRequestException('Individual events require user_id');
      }
      if (dto.team_category_id || dto.pic_user_id) {
        throw new BadRequestException(
          'Individual events must not have team_category_id or pic_user_id',
        );
      }
      if (dto.member_ids && dto.member_ids.length > 0) {
        throw new BadRequestException('Individual events must not have member_ids');
      }
      await this.validateUserRoles([dto.user_id]);
    }

    // An EXACT duplicate — the same person, the same day, the same shift — is
    // never a real assignment: `UQ_schedules_user_date_shift` makes the second
    // occurrence impossible to materialize, so it would linger as an
    // undeletable projected ghost. Reject it up front. A *different* shift that
    // merely overlaps in time stays a warning (ADR-047, calendar-style).
    await this.assertNoDuplicateOccurrence(
      dto.is_team
        ? [dto.pic_user_id as string, ...(dto.member_ids || [])]
        : [dto.user_id as string],
      dto.shift_definition_id,
      {
        recurrence_type: dto.recurrence_type,
        start_date: dto.start_date,
        end_date: dto.end_date ?? null,
        recurrence_config: dto.recurrence_config ?? null,
      } as ScheduleEvent,
    );

    // Create event
    const event = this.eventRepo.create({
      title: dto.title || null,
      recurrence_type: dto.recurrence_type,
      start_date: dto.start_date,
      end_date: dto.end_date || null,
      recurrence_config: dto.recurrence_config || null,
      shift_definition_id: dto.shift_definition_id,
      scope: dto.scope,
      location_id: dto.location_id || null,
      region_id: dto.region_id || null,
      district_id: dto.district_id || null,
      is_team: dto.is_team,
      user_id: dto.user_id || null,
      team_category_id: dto.team_category_id || null,
      pic_user_id: dto.pic_user_id || null,
      is_active: true,
      notes: dto.notes || null,
      created_by: actor.id,
      updated_by: actor.id,
    });

    const saved = await this.eventRepo.save(event);

    // Add team members
    if (dto.is_team && dto.member_ids && dto.member_ids.length > 0) {
      await this.memberRepo.save(
        dto.member_ids.map((userId) =>
          this.memberRepo.create({ schedule_event_id: saved.id, user_id: userId }),
        ),
      );
    }

    // Reload with relations
    const loaded = await this.findOne(saved.id, actor);

    // Materialize
    const materialization = await this.materializer.materializeEvent(loaded);

    // Audit
    await this.recordAudit('create', saved.id, actor.id, null, {
      recurrence_type: saved.recurrence_type,
      scope: saved.scope,
      is_team: saved.is_team,
    });

    return { event: loaded, materialization };
  }

  /**
   * Update a schedule event.
   * Takes `edit_scope` query param: 'series' (default), 'this_and_future' (requires from_date).
   */
  async update(
    id: string,
    dto: UpdateScheduleEventDto,
    editScope: EditScope,
    fromDate: string | undefined,
    actor: User,
  ): Promise<{ event: ScheduleEvent; new_event?: ScheduleEvent; materialization: any }> {
    const event = await this.findOne(id, actor);
    const today = TimezoneUtil.jakartaDateString();

    // Member edits must keep the eligibility rules of create.
    if (dto.member_ids !== undefined) {
      if (!event.is_team && dto.member_ids.length > 0) {
        throw new BadRequestException('Individual events must not have member_ids');
      }
      if (dto.member_ids.length > 0) {
        await this.validateUserRoles(dto.member_ids);
      }
    }

    // If this_and_future, create a new event starting from fromDate with the changes
    if (editScope === EditScope.THIS_AND_FUTURE) {
      if (!fromDate) {
        throw new BadRequestException('this_and_future scope requires from_date');
      }
      // Past occurrences are never rewritten (ADR-047).
      if (fromDate < today) {
        throw new BadRequestException('from_date must not be in the past');
      }
      // Splitting before (or at) the series start would leave the original
      // with end_date < start_date — that's a series edit, not a split.
      if (fromDate <= event.start_date) {
        throw new BadRequestException(
          'from_date must be after the series start_date — use edit_scope=series instead',
        );
      }
      const prevEndDate = event.end_date;

      // Validate the EFFECTIVE shape of the split-off event before mutating.
      const effective = {
        shift_definition_id: dto.shift_definition_id || event.shift_definition_id,
        scope: dto.scope || event.scope,
        location_id: dto.location_id !== undefined ? dto.location_id : event.location_id,
        region_id: dto.region_id !== undefined ? dto.region_id : event.region_id,
        district_id: dto.district_id !== undefined ? dto.district_id : event.district_id,
        start_date: fromDate,
        end_date: dto.end_date !== undefined ? dto.end_date : prevEndDate,
        recurrence_type: dto.recurrence_type || event.recurrence_type,
        recurrence_config: dto.recurrence_config || event.recurrence_config,
      };
      await this.validateEventShape(effective, actor);

      // Set original event end_date to fromDate-1
      event.end_date = this.addDays(fromDate, -1);
      event.updated_by = actor.id;
      await this.eventRepo.save(event);

      // Create new event with updated fields
      const newEvent = this.eventRepo.create({
        title: dto.title !== undefined ? dto.title : event.title,
        ...effective,
        is_team: event.is_team,
        user_id: event.user_id,
        team_category_id: event.team_category_id,
        pic_user_id: event.pic_user_id,
        is_active: event.is_active,
        notes: dto.notes !== undefined ? dto.notes : event.notes,
        created_by: event.created_by,
        updated_by: actor.id,
      });

      const newSaved = await this.eventRepo.save(newEvent);

      // Members carry over to the split-off event (dto overrides when given —
      // omitting member_ids must NOT silently drop the team).
      if (event.is_team) {
        const memberIds =
          dto.member_ids !== undefined
            ? dto.member_ids
            : (event.members ?? []).map((m) => m.user_id);
        if (memberIds.length > 0) {
          const members = memberIds.map((userId) =>
            this.memberRepo.create({
              schedule_event_id: newSaved.id,
              user_id: userId,
            }),
          );
          await this.memberRepo.save(members);
        }
      }

      // Hard-delete future occurrences of old event
      await this.scheduleRepo
        .createQueryBuilder()
        .delete()
        .from(Schedule)
        .where('schedule_event_id = :eventId AND schedule_date >= :date AND is_detached = false', {
          eventId: event.id,
          date: fromDate,
        })
        .execute();

      // Materialize new event
      const newLoaded = await this.findOne(newSaved.id, actor);
      const materialization = await this.materializer.materializeEvent(newLoaded);

      return {
        event: await this.findOne(event.id, actor),
        new_event: newLoaded,
        materialization,
      };
    } else if (editScope === EditScope.SERIES) {
      // Update series in place
      const oldValue = {
        recurrence_type: event.recurrence_type,
        scope: event.scope,
      };

      if (dto.title !== undefined) event.title = dto.title;
      if (dto.recurrence_type) event.recurrence_type = dto.recurrence_type;
      if (dto.start_date) event.start_date = dto.start_date;
      if (dto.end_date !== undefined) event.end_date = dto.end_date;
      if (dto.recurrence_config) event.recurrence_config = dto.recurrence_config;
      if (dto.shift_definition_id) event.shift_definition_id = dto.shift_definition_id;
      if (dto.scope) event.scope = dto.scope;
      if (dto.location_id !== undefined) event.location_id = dto.location_id;
      if (dto.region_id !== undefined) event.region_id = dto.region_id;
      if (dto.district_id !== undefined) event.district_id = dto.district_id;
      if (dto.notes !== undefined) event.notes = dto.notes;
      event.updated_by = actor.id;

      // Validate the EFFECTIVE post-update shape — a scope/location/recurrence
      // change must satisfy the same rules as create (friendly 400s instead of
      // DB CHECK 500s; district-scope enforced on the new location/region).
      await this.validateEventShape(
        {
          shift_definition_id: event.shift_definition_id,
          scope: event.scope,
          location_id: event.location_id,
          region_id: event.region_id,
          district_id: event.district_id,
          start_date: event.start_date,
          end_date: event.end_date,
          recurrence_type: event.recurrence_type,
          recurrence_config: event.recurrence_config,
        },
        actor,
      );

      await this.eventRepo.save(event);

      // Update members if team
      if (event.is_team && dto.member_ids !== undefined) {
        await this.memberRepo.delete({ schedule_event_id: event.id });
        if (dto.member_ids.length > 0) {
          const members = dto.member_ids.map((userId) =>
            this.memberRepo.create({
              schedule_event_id: event.id,
              user_id: userId,
            }),
          );
          await this.memberRepo.save(members);
        }
      }

      // Re-materialize from today forward
      const materialization = await this.materializer.rematerializeSeries(event, today);

      await this.recordAudit('update', event.id, actor.id, oldValue, {
        recurrence_type: event.recurrence_type,
        scope: event.scope,
      });

      return { event: await this.findOne(event.id, actor), materialization };
    }

    // THIS scope is handled at the row level (not event-level edit)
    throw new BadRequestException('this scope must use the /schedules endpoints');
  }

  /**
   * Delete a schedule event.
   * Scope: 'this' soft-deletes that date's occurrence rows (tombstones —
   * never regenerated); 'series' soft-deletes the event + hard-deletes future
   * non-detached rows; 'this_and_future' sets end_date and hard-deletes
   * future rows. Past dates are never touched.
   */
  async delete(id: string, scope: EditScope, date: string | undefined, actor: User): Promise<void> {
    const event = await this.findOne(id, actor);
    const today = TimezoneUtil.jakartaDateString();

    if ((scope === EditScope.THIS || scope === EditScope.THIS_AND_FUTURE) && !date) {
      throw new BadRequestException(`${scope} scope requires date`);
    }
    // Past occurrences are never rewritten (ADR-047).
    if ((scope === EditScope.THIS || scope === EditScope.THIS_AND_FUTURE) && date! < today) {
      throw new BadRequestException('date must not be in the past');
    }

    if (scope === EditScope.THIS) {
      // Soft-delete this date's occurrences of the event — the soft-deleted
      // rows stay behind as tombstones so re-materialization never resurrects
      // the day.
      const rows = await this.scheduleRepo.find({
        where: { schedule_event_id: event.id, schedule_date: date! },
      });
      if (rows.length === 0) {
        throw new NotFoundException('No occurrence of this event on that date');
      }
      for (const row of rows) {
        row.deleted_by = actor.id;
      }
      await this.scheduleRepo.softRemove(rows);
    } else if (scope === EditScope.SERIES) {
      // Soft-delete the event
      event.deleted_by = actor.id;
      await this.eventRepo.softRemove(event);

      // Hard-delete future non-detached occurrences
      await this.scheduleRepo
        .createQueryBuilder()
        .delete()
        .from(Schedule)
        .where('schedule_event_id = :eventId AND schedule_date >= :today AND is_detached = false', {
          eventId: event.id,
          today,
        })
        .execute();
    } else if (scope === EditScope.THIS_AND_FUTURE) {
      // Set end_date to date-1
      event.end_date = this.addDays(date!, -1);
      event.updated_by = actor.id;
      await this.eventRepo.save(event);

      // Hard-delete future non-detached occurrences
      await this.scheduleRepo
        .createQueryBuilder()
        .delete()
        .from(Schedule)
        .where('schedule_event_id = :eventId AND schedule_date >= :date AND is_detached = false', {
          eventId: event.id,
          date,
        })
        .execute();
    }

    await this.recordAudit('delete', event.id, actor.id, { scope }, null);
  }

  private async validateUserRoles(userIds: string[]): Promise<void> {
    const unique = Array.from(new Set(userIds));
    const users = await this.userRepo.find({
      where: { id: In(unique) },
    });
    // A missing row (unknown id or soft-deleted user) must fail too — a
    // shorter result set would otherwise slip through silently.
    if (users.length !== unique.length) {
      throw new BadRequestException('One or more scheduled users do not exist');
    }
    const validRoles = ['satgas', 'linmas', 'korlap'];
    for (const user of users) {
      if (!validRoles.includes(user.role) || !user.is_active) {
        throw new BadRequestException(
          `User ${user.full_name ?? user.id} is not eligible (must be an active satgas/linmas/korlap)`,
        );
      }
    }
  }

  /**
   * Shared shape validation for create / series-edit / this-and-future split:
   * shift existence, scope↔location/region coherency (+ district scoping for
   * non-city actors), date ordering, and per-type recurrence_config rules.
   * Mirrors the DB CHECKs so callers get 400s instead of constraint 500s.
   */
  private async validateEventShape(
    e: {
      shift_definition_id: string;
      scope: ScheduleScope;
      location_id: string | null;
      region_id: string | null;
      district_id: string | null;
      start_date: string;
      end_date: string | null;
      recurrence_type: RecurrenceType;
      recurrence_config: { interval_n?: number; weekdays?: number[]; dates?: string[] } | null;
    },
    actor: User,
  ): Promise<void> {
    const shift = await this.shiftRepo.findOne({ where: { id: e.shift_definition_id } });
    if (!shift) throw new NotFoundException('Shift definition not found');

    if (e.scope === ScheduleScope.STATIC) {
      if (!e.location_id) throw new BadRequestException('Static scope requires location_id');
      if (e.region_id || e.district_id)
        throw new BadRequestException('Static scope must not have region_id or district_id');
      const loc = await this.locationRepo.findOne({ where: { id: e.location_id } });
      if (!loc) throw new NotFoundException('Location not found');
      this.assertDistrictScope(loc.district_id, actor, 'location');
    } else if (e.scope === ScheduleScope.MOBILE) {
      if (!e.region_id) throw new BadRequestException('Mobile scope requires region_id');
      if (e.location_id || e.district_id)
        throw new BadRequestException('Mobile scope must not have location_id or district_id');
      const region = await this.regionRepo.findOne({ where: { id: e.region_id } });
      if (!region) throw new NotFoundException('Region not found');
      this.assertDistrictScope(region.district_id, actor, 'region');
    } else if (e.scope === ScheduleScope.RAYON) {
      // District scope: district-wide placement, no location/region.
      if (!e.district_id) throw new BadRequestException('District scope requires district_id');
      if (e.location_id || e.region_id)
        throw new BadRequestException('District scope must not have location_id or region_id');
      const district = await this.districtRepo.findOne({ where: { id: e.district_id } });
      if (!district) throw new NotFoundException('District not found');
      this.assertDistrictScope(district.id, actor, 'district');
    } else {
      // City scope: whole-Surabaya placement, no district/region/location.
      if (e.location_id || e.region_id || e.district_id)
        throw new BadRequestException(
          'City scope must not have location_id, region_id or district_id',
        );
      if (!MONITORING_CITY.includes(actor.role)) {
        throw new ForbiddenException(
          'Only city-scope roles can place a city-wide (Seluruh Surabaya) schedule',
        );
      }
    }

    if (e.end_date && e.start_date > e.end_date) {
      throw new BadRequestException('end_date must be >= start_date');
    }

    switch (e.recurrence_type) {
      case RecurrenceType.EVERY_N_DAYS: {
        const n = e.recurrence_config?.interval_n;
        if (!n || n < 2 || n > 30) {
          throw new BadRequestException('every_n_days requires interval_n between 2 and 30');
        }
        break;
      }
      case RecurrenceType.WEEKLY: {
        const days = e.recurrence_config?.weekdays;
        if (!days || days.length === 0) {
          throw new BadRequestException('weekly recurrence requires at least one weekday');
        }
        break;
      }
      case RecurrenceType.SPECIFIC_DATES: {
        const dates = e.recurrence_config?.dates;
        if (!dates || dates.length === 0) {
          throw new BadRequestException('specific_dates recurrence requires at least one date');
        }
        const outside = dates.filter(
          (d) => d < e.start_date || (e.end_date != null && d > e.end_date),
        );
        if (outside.length > 0) {
          throw new BadRequestException(
            `specific dates must fall within [start_date, end_date]: ${outside.join(', ')}`,
          );
        }
        break;
      }
      default:
        break;
    }
  }

  private assertDistrictScope(
    districtId: string | null | undefined,
    actor: User,
    what: string,
  ): void {
    if (MONITORING_CITY.includes(actor.role)) return;
    if (!actor.district_id) {
      throw new ForbiddenException('Your account is missing a district assignment');
    }
    if (districtId !== actor.district_id) {
      throw new ForbiddenException(`This ${what} is outside your district`);
    }
  }

  private async recordAudit(
    action: 'create' | 'update' | 'delete',
    eventId: string,
    actorId: string,
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
  ): Promise<void> {
    if (!actorId) return;
    try {
      await this.auditLog.log({
        entity_type: 'schedule_event',
        entity_id: eventId,
        action,
        actor_id: actorId,
        old_value: oldValue,
        new_value: newValue,
      });
    } catch {
      // Non-fatal
    }
  }

  /**
   * Reject an assignment that would duplicate an existing occurrence exactly —
   * same user, same date, same shift.
   *
   * The DB already refuses it (`UQ_schedules_user_date_shift`), so the row could
   * only ever exist as a *projected* ghost: greyed on the board, impossible to
   * delete (its id is `projected:…`, not a row), and counted in the role tally.
   * Better to say so at assignment time than to create something that can never
   * become real. Overlaps against a DIFFERENT shift are still allowed with a
   * warning (ADR-047, calendar-style).
   */
  private async assertNoDuplicateOccurrence(
    userIds: string[],
    shiftDefinitionId: string,
    recurrence: ScheduleEvent,
    excludeEventId?: string,
  ): Promise<void> {
    const members = userIds.filter(Boolean);
    if (!members.length || !shiftDefinitionId) return;

    const today = TimezoneUtil.jakartaDateString();
    const from = recurrence.start_date > today ? recurrence.start_date : today;
    // Bounded window: an open-ended recurrence would otherwise expand forever.
    // The horizon only has to reach far enough to catch a duplicate that would
    // actually materialize.
    const horizon =
      typeof this.materializer.horizonDays === 'function' ? this.materializer.horizonDays() : 30;
    const to = recurrence.end_date ?? this.addDays(from, horizon);
    const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(recurrence, from, to);
    if (!dates.length) return;

    const clash = await this.scheduleRepo.findOne({
      where: {
        user_id: In(members),
        schedule_date: In(dates),
        shift_definition_id: shiftDefinitionId,
      },
      relations: ['user', 'shift_definition'],
    });
    if (clash && clash.schedule_event_id !== excludeEventId) {
      // Verbose on purpose: the operator needs to know WHO clashes, on WHICH
      // shift and date, and what to do instead — a second occurrence on the same
      // shift is impossible (one clock-in per shift), but WIDENING the existing
      // one is exactly what they want when the worker covers more ground.
      const who = clash.user?.full_name ?? 'Petugas ini';
      const shiftName = clash.shift_definition?.name ?? 'shift ini';
      throw new BadRequestException(
        `${who} sudah punya jadwal ${shiftName} pada ${clash.schedule_date}. ` +
          'Satu petugas hanya bisa punya satu jadwal per shift per hari (satu shift = satu kehadiran). ' +
          'Untuk menambah cakupan, ubah jadwal yang sudah ada dan tambahkan lokasi/kawasannya ' +
          '— jangan membuat jadwal kedua.',
      );
    }
  }

  private async assertTeamCategoryExists(id: string): Promise<void> {
    const type = await this.teamCategoryRepo.findOne({
      where: { id, is_active: true },
    });
    if (!type) {
      throw new BadRequestException('Team type not found or inactive');
    }
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }
}
