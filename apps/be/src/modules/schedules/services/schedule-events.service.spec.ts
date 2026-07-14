import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScheduleEventsService } from './schedule-events.service';
import { ScheduleEvent } from '../entities/schedule-event.entity';
import { ScheduleEventMember } from '../entities/schedule-event-member.entity';
import { Schedule } from '../entities/schedule.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { Location } from '../../locations/entities/location.entity';
import { Region } from '../../regions/entities/region.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import { TeamCategory } from '../../teams/entities/team-category.entity';
import { ScheduleMaterializerService } from './schedule-materializer.service';
import { AuditLogService } from '../../audit/audit.service';
import { ScheduleScope } from '../enums/schedule-scope.enum';
import { RecurrenceType } from '../enums/recurrence-type.enum';
import { EditScope } from '../enums/edit-scope.enum';

describe('ScheduleEventsService', () => {
  let service: ScheduleEventsService;
  let eventRepo: Record<string, jest.Mock>;
  let memberRepo: Record<string, jest.Mock>;
  let scheduleRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let locationRepo: Record<string, jest.Mock>;
  let regionRepo: Record<string, jest.Mock>;
  let rayonRepo: Record<string, jest.Mock>;
  let shiftRepo: Record<string, jest.Mock>;
  let teamCategoryRepo: Record<string, jest.Mock>;
  let materializer: Record<string, jest.Mock>;
  let auditLog: Record<string, jest.Mock>;

  const ADMIN = { id: 'admin', role: UserRole.SUPERADMIN } as User;

  const mockShift: ShiftDefinition = {
    id: 'shift-1',
    name: 'Shift 1',
    code: 'S1',
    start_time: '06:00:00',
    end_time: '15:00:00',
    crosses_midnight: false,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockLocation: Location = {
    id: 'loc-1',
    name: 'Location 1',
    rayon_id: 'rayon-1',
  } as any;

  const mockRegion: Region = {
    id: 'region-1',
    name: 'Region 1',
    rayon_id: 'rayon-1',
  } as any;

  beforeEach(async () => {
    eventRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: x.id ?? 'event-1', ...x })),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    memberRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(),
      delete: jest.fn(),
    };
    scheduleRepo = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      softRemove: jest.fn(),
    };
    userRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    locationRepo = {
      findOne: jest.fn(),
    };
    regionRepo = {
      findOne: jest.fn(),
    };
    rayonRepo = {
      findOne: jest.fn(),
    };
    shiftRepo = {
      findOne: jest.fn(),
    };
    teamCategoryRepo = {
      findOne: jest.fn(),
    };
    materializer = {
      materializeEvent: jest.fn(),
      rematerializeSeries: jest.fn(),
    };
    auditLog = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleEventsService,
        { provide: getRepositoryToken(ScheduleEvent), useValue: eventRepo },
        { provide: getRepositoryToken(ScheduleEventMember), useValue: memberRepo },
        { provide: getRepositoryToken(Schedule), useValue: scheduleRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Location), useValue: locationRepo },
        { provide: getRepositoryToken(Region), useValue: regionRepo },
        { provide: getRepositoryToken(Rayon), useValue: rayonRepo },
        { provide: getRepositoryToken(ShiftDefinition), useValue: shiftRepo },
        { provide: getRepositoryToken(TeamCategory), useValue: teamCategoryRepo },
        { provide: ScheduleMaterializerService, useValue: materializer },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<ScheduleEventsService>(ScheduleEventsService);
  });

  describe('delete - scope THIS', () => {
    it('soft-deletes that dates occurrence rows', async () => {
      const event = {
        id: 'event-1',
        schedule_date: '2026-07-15',
      };
      eventRepo.findOne.mockResolvedValue(event);
      const rows = [{ id: 'row-1', schedule_event_id: 'event-1', schedule_date: '2026-07-15' }];
      scheduleRepo.find.mockResolvedValue(rows);

      await service.delete('event-1', EditScope.THIS, '2026-07-15', ADMIN);

      expect(scheduleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schedule_event_id: 'event-1',
            schedule_date: '2026-07-15',
          }),
        }),
      );
      expect(scheduleRepo.softRemove).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'row-1' })]),
      );
    });

    it('404s when no occurrences exist on that date', async () => {
      eventRepo.findOne.mockResolvedValue({ id: 'event-1' });
      scheduleRepo.find.mockResolvedValue([]); // No rows

      await expect(service.delete('event-1', EditScope.THIS, '2026-07-15', ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update - THIS_AND_FUTURE member copy', () => {
    it('copies existing members when member_ids omitted', async () => {
      const event = {
        id: 'event-1',
        title: 'Team Event',
        start_date: '2026-07-10',
        end_date: null,
        shift_definition_id: mockShift.id,
        scope: ScheduleScope.STATIC,
        location_id: mockLocation.id,
        region_id: null,
        recurrence_type: RecurrenceType.NONE,
        recurrence_config: null,
        is_team: true,
        user_id: null,
        team_category_id: 'team-1',
        pic_user_id: 'pic-1',
        members: [{ user_id: 'member-1' }, { user_id: 'member-2' }],
        created_by: 'admin',
      };
      eventRepo.findOne.mockResolvedValue(event);
      shiftRepo.findOne.mockResolvedValue(mockShift);
      locationRepo.findOne.mockResolvedValue(mockLocation);
      eventRepo.save.mockResolvedValue(event);
      const qb = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      scheduleRepo.createQueryBuilder.mockReturnValue(qb);

      await service.update('event-1', {}, EditScope.THIS_AND_FUTURE, '2026-07-20', ADMIN);

      // When member_ids is omitted, existing members should be copied
      expect(memberRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: 'member-1' }),
          expect.objectContaining({ user_id: 'member-2' }),
        ]),
      );
    });
  });

  describe('update - scope change validation', () => {
    it('rejects series update changing scope to mobile without region_id', async () => {
      const event = {
        id: 'event-1',
        start_date: '2026-07-10',
        end_date: null,
        shift_definition_id: mockShift.id,
        scope: ScheduleScope.STATIC,
        location_id: mockLocation.id,
        region_id: null,
        recurrence_type: RecurrenceType.NONE,
        recurrence_config: null,
        is_team: false,
        user_id: 'user-1',
      };
      eventRepo.findOne.mockResolvedValue(event);
      shiftRepo.findOne.mockResolvedValue(mockShift);

      await expect(
        service.update(
          'event-1',
          { scope: ScheduleScope.MOBILE },
          EditScope.SERIES,
          undefined,
          ADMIN,
        ),
      ).rejects.toThrow(/requires region_id/i);
    });

    it('rejects series update changing scope to static without location_id', async () => {
      const event = {
        id: 'event-1',
        start_date: '2026-07-10',
        end_date: null,
        shift_definition_id: mockShift.id,
        scope: ScheduleScope.MOBILE,
        location_id: null,
        region_id: mockRegion.id,
        recurrence_type: RecurrenceType.NONE,
        recurrence_config: null,
        is_team: false,
        user_id: 'user-1',
      };
      eventRepo.findOne.mockResolvedValue(event);
      shiftRepo.findOne.mockResolvedValue(mockShift);

      await expect(
        service.update(
          'event-1',
          { scope: ScheduleScope.STATIC },
          EditScope.SERIES,
          undefined,
          ADMIN,
        ),
      ).rejects.toThrow(/requires location_id/i);
    });
  });

  describe('rayon scope', () => {
    it('rejects a rayon-scoped event without rayon_id', async () => {
      shiftRepo.findOne.mockResolvedValue(mockShift);
      userRepo.find.mockResolvedValue([{ id: 'user-1', role: 'satgas', is_active: true }]);

      await expect(
        service.create(
          {
            is_team: false,
            user_id: 'user-1',
            shift_definition_id: mockShift.id,
            scope: ScheduleScope.RAYON,
            start_date: '2026-07-10',
            recurrence_type: RecurrenceType.NONE,
          },
          ADMIN,
        ),
      ).rejects.toThrow(/rayon scope requires rayon_id/i);
    });

    it('rejects a rayon-scoped event that also carries a location_id', async () => {
      shiftRepo.findOne.mockResolvedValue(mockShift);

      await expect(
        service.create(
          {
            is_team: false,
            user_id: 'user-1',
            shift_definition_id: mockShift.id,
            scope: ScheduleScope.RAYON,
            rayon_id: 'rayon-1',
            location_id: mockLocation.id,
            start_date: '2026-07-10',
            recurrence_type: RecurrenceType.NONE,
          },
          ADMIN,
        ),
      ).rejects.toThrow(/must not have location_id or region_id/i);
    });

    it('accepts a valid rayon-scoped individual event', async () => {
      shiftRepo.findOne.mockResolvedValue(mockShift);
      rayonRepo.findOne.mockResolvedValue({ id: 'rayon-1', name: 'Rayon 1' });
      userRepo.find.mockResolvedValue([{ id: 'user-1', role: 'satgas', is_active: true }]);
      eventRepo.findOne.mockResolvedValue({
        id: 'event-1',
        scope: ScheduleScope.RAYON,
        rayon_id: 'rayon-1',
      });
      materializer.materializeEvent.mockResolvedValue({ created: 0, skipped: [] });

      const result = await service.create(
        {
          is_team: false,
          user_id: 'user-1',
          shift_definition_id: mockShift.id,
          scope: ScheduleScope.RAYON,
          rayon_id: 'rayon-1',
          start_date: '2026-07-10',
          recurrence_type: RecurrenceType.NONE,
        },
        ADMIN,
      );

      expect(result.event).toBeDefined();
      expect(eventRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ scope: ScheduleScope.RAYON, rayon_id: 'rayon-1' }),
      );
    });
  });

  describe('city scope', () => {
    it('rejects a city-scoped event that carries a rayon/region/location id', async () => {
      shiftRepo.findOne.mockResolvedValue(mockShift);

      await expect(
        service.create(
          {
            is_team: false,
            user_id: 'user-1',
            shift_definition_id: mockShift.id,
            scope: ScheduleScope.CITY,
            rayon_id: 'rayon-1',
            start_date: '2026-07-10',
            recurrence_type: RecurrenceType.NONE,
          },
          ADMIN,
        ),
      ).rejects.toThrow(/city scope must not have/i);
    });

    it('rejects a city-scoped event from a non-city role', async () => {
      shiftRepo.findOne.mockResolvedValue(mockShift);
      userRepo.find.mockResolvedValue([{ id: 'user-1', role: 'satgas', is_active: true }]);
      const korlap = { id: 'k', role: UserRole.KORLAP, rayon_id: 'rayon-1' } as User;

      await expect(
        service.create(
          {
            is_team: false,
            user_id: 'user-1',
            shift_definition_id: mockShift.id,
            scope: ScheduleScope.CITY,
            start_date: '2026-07-10',
            recurrence_type: RecurrenceType.NONE,
          },
          korlap,
        ),
      ).rejects.toThrow(/city-scope roles/i);
    });

    it('accepts a valid city-scoped individual event (city role)', async () => {
      shiftRepo.findOne.mockResolvedValue(mockShift);
      userRepo.find.mockResolvedValue([{ id: 'user-1', role: 'satgas', is_active: true }]);
      eventRepo.findOne.mockResolvedValue({ id: 'event-1', scope: ScheduleScope.CITY });
      materializer.materializeEvent.mockResolvedValue({ created: 0, skipped: [] });

      const result = await service.create(
        {
          is_team: false,
          user_id: 'user-1',
          shift_definition_id: mockShift.id,
          scope: ScheduleScope.CITY,
          start_date: '2026-07-10',
          recurrence_type: RecurrenceType.NONE,
        },
        ADMIN,
      );

      expect(result.event).toBeDefined();
      expect(eventRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: ScheduleScope.CITY,
          rayon_id: null,
          region_id: null,
          location_id: null,
        }),
      );
    });
  });

  describe('update - member_ids on individual event', () => {
    it('rejects updating member_ids on an individual event', async () => {
      const event = {
        id: 'event-1',
        start_date: '2026-07-10',
        end_date: null,
        shift_definition_id: mockShift.id,
        scope: ScheduleScope.STATIC,
        location_id: mockLocation.id,
        recurrence_type: RecurrenceType.NONE,
        recurrence_config: null,
        is_team: false,
        user_id: 'user-1',
        members: [],
      };
      eventRepo.findOne.mockResolvedValue(event);
      shiftRepo.findOne.mockResolvedValue(mockShift);
      locationRepo.findOne.mockResolvedValue(mockLocation);

      await expect(
        service.update('event-1', { member_ids: ['user-2'] }, EditScope.SERIES, undefined, ADMIN),
      ).rejects.toThrow(/must not have member_ids/i);
    });
  });

  describe('validateUserRoles', () => {
    it('rejects unknown user ids', async () => {
      userRepo.find.mockResolvedValue([{ id: 'user-1', role: 'satgas', is_active: true }]); // Only 1 found
      shiftRepo.findOne.mockResolvedValue(mockShift);
      locationRepo.findOne.mockResolvedValue(mockLocation);
      teamCategoryRepo.findOne.mockResolvedValue({ id: 'team-1', is_active: true }); // Team type exists

      await expect(
        service.create(
          {
            is_team: true,
            team_category_id: 'team-1',
            pic_user_id: 'pic-1',
            member_ids: ['user-1', 'unknown-user'],
            shift_definition_id: mockShift.id,
            scope: ScheduleScope.STATIC,
            location_id: mockLocation.id,
            start_date: '2026-07-10',
            recurrence_type: RecurrenceType.NONE,
          },
          ADMIN,
        ),
      ).rejects.toThrow(/do not exist/i);
    });

    it('rejects inactive users', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'user-1', role: 'satgas', is_active: false }, // Inactive
      ]);
      shiftRepo.findOne.mockResolvedValue(mockShift);
      locationRepo.findOne.mockResolvedValue(mockLocation);
      teamCategoryRepo.findOne.mockResolvedValue({ id: 'team-1', is_active: true }); // Team type exists

      await expect(
        service.create(
          {
            is_team: true,
            team_category_id: 'team-1',
            pic_user_id: 'user-1',
            shift_definition_id: mockShift.id,
            scope: ScheduleScope.STATIC,
            location_id: mockLocation.id,
            start_date: '2026-07-10',
            recurrence_type: RecurrenceType.NONE,
          },
          ADMIN,
        ),
      ).rejects.toThrow(/not eligible/i);
    });

    it('rejects users with non-schedulable roles', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'staff-1', role: 'staff_kecamatan', is_active: true }, // Non-schedulable
      ]);
      shiftRepo.findOne.mockResolvedValue(mockShift);
      locationRepo.findOne.mockResolvedValue(mockLocation);

      await expect(
        service.create(
          {
            is_team: false,
            user_id: 'staff-1',
            shift_definition_id: mockShift.id,
            scope: ScheduleScope.STATIC,
            location_id: mockLocation.id,
            start_date: '2026-07-10',
            recurrence_type: RecurrenceType.NONE,
          },
          ADMIN,
        ),
      ).rejects.toThrow(/not eligible/i);
    });
  });
});
