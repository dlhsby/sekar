import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MonitoringReassignService } from './monitoring-reassign.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { UserTrackingStatus } from '../entities/user-tracking-status.entity';
import { SchedulesService } from '../../schedules/schedules.service';
import { ReassignWorkerDto } from '../dto/reassign-worker.dto';
import { EventsGateway } from '../../../gateways/events.gateway';
import { EventType } from '../../../gateways/dto/events.dto';
import { AuditLogService } from '../../audit/audit.service';

describe('MonitoringReassignService', () => {
  let service: MonitoringReassignService;
  let userRepository: any;
  let areaRepository: any;
  let trackingRepository: any;
  let dailySchedulesService: any;
  let eventsGateway: any;
  let auditLogService: any;

  // ── Shared fixture factories ─────────────────────────────────────────────

  const RAYON_A = 'rayon-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const RAYON_B = 'rayon-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const AREA_A1_ID = 'area-a1aa-a1aa-a1aa-a1aaa1aaa1aa';
  const AREA_A2_ID = 'area-a2aa-a2aa-a2aa-a2aaa2aaa2aa';
  const AREA_B1_ID = 'area-b1bb-b1bb-b1bb-b1bbb1bbb1bb';

  function makeUser(overrides: Partial<User> = {}): User {
    return {
      id: 'user-1111-1111-1111-111111111111',
      username: 'satgas1',
      full_name: 'Satgas Satu',
      role: UserRole.SATGAS,
      is_active: true,
      area_id: AREA_A1_ID,
      area: makeArea({ id: AREA_A1_ID, name: 'Taman Bungkul', rayon_id: RAYON_A }),
      rayon_id: undefined,
      password_hash: 'hashed',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    } as User;
  }

  function makeArea(overrides: Partial<Area> = {}): Area {
    return {
      id: AREA_A2_ID,
      name: 'Taman Mundu',
      rayon_id: RAYON_A,
      gps_lat: -7.29,
      gps_lng: 112.74,
      radius_meters: 100,
      is_active: true,
      area_type_id: 'type-uuid',
      areaType: {} as any,
      address: 'Surabaya',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    } as Area;
  }

  function makeSuperadmin(overrides: Partial<User> = {}): User {
    return makeUser({
      id: 'user-super-super-super-supersuper',
      username: 'superadmin',
      full_name: 'Super Admin',
      role: UserRole.SUPERADMIN,
      area_id: undefined,
      area: undefined,
      rayon_id: undefined,
      ...overrides,
    });
  }

  function makeKepalaRayon(rayonId: string, overrides: Partial<User> = {}): User {
    return makeUser({
      id: 'user-kr00-kr00-kr00-kr00kr00kr00',
      username: 'kepalarayon1',
      full_name: 'Kepala Rayon Satu',
      role: UserRole.KEPALA_RAYON,
      rayon_id: rayonId,
      area_id: undefined,
      area: undefined,
      ...overrides,
    });
  }

  function makeDto(overrides: Partial<ReassignWorkerDto> = {}): ReassignWorkerDto {
    return {
      user_id: 'user-1111-1111-1111-111111111111',
      target_area_id: AREA_A2_ID,
      ...overrides,
    };
  }

  // ── Module setup ─────────────────────────────────────────────────────────

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    areaRepository = {
      findOne: jest.fn(),
    };

    trackingRepository = {
      update: jest.fn(),
    };

    dailySchedulesService = {
      overrideForDay: jest.fn().mockResolvedValue('roster-row-uuid'),
    };

    eventsGateway = {
      emitUserReassigned: jest.fn(),
    };

    auditLogService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringReassignService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Area), useValue: areaRepository },
        { provide: getRepositoryToken(UserTrackingStatus), useValue: trackingRepository },
        { provide: SchedulesService, useValue: dailySchedulesService },
        { provide: EventsGateway, useValue: eventsGateway },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<MonitoringReassignService>(MonitoringReassignService);
  });

  // ── Tests ─────────────────────────────────────────────────────────────────

  describe('reassign', () => {
    // 1. Happy path: successful reassignment
    it('should successfully reassign worker to new area', async () => {
      const worker = makeUser();
      const targetArea = makeArea({ id: AREA_A2_ID, name: 'Taman Mundu', rayon_id: RAYON_A });
      const requestingUser = makeSuperadmin();
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.reassign(dto, requestingUser);

      expect(result.user_id).toBe(worker.id);
      expect(result.new_area_id).toBe(AREA_A2_ID);
      expect(result.new_area_name).toBe('Taman Mundu');
    });

    // 2. Worker not found
    it('should throw NotFoundException when worker is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const dto = makeDto({ user_id: 'non-existent-uuid' });

      await expect(service.reassign(dto, makeSuperadmin())).rejects.toThrow(NotFoundException);
      await expect(service.reassign(dto, makeSuperadmin())).rejects.toThrow('non-existent-uuid');
    });

    // 3. Non-reassignable role (top_management)
    it('should throw BadRequestException when worker has non-reassignable role', async () => {
      const topMgmtWorker = makeUser({ role: UserRole.TOP_MANAGEMENT });
      userRepository.findOne.mockResolvedValue(topMgmtWorker);
      areaRepository.findOne.mockResolvedValue(makeArea());

      await expect(service.reassign(makeDto(), makeSuperadmin())).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reassign(makeDto(), makeSuperadmin())).rejects.toThrow(
        UserRole.TOP_MANAGEMENT,
      );
    });

    // 3b. Non-reassignable role (korlap) — extra coverage for the roles boundary
    it('should throw BadRequestException when worker has korlap role', async () => {
      const korlapWorker = makeUser({ role: UserRole.KORLAP });
      userRepository.findOne.mockResolvedValue(korlapWorker);
      areaRepository.findOne.mockResolvedValue(makeArea());

      await expect(service.reassign(makeDto(), makeSuperadmin())).rejects.toThrow(
        BadRequestException,
      );
    });

    // 4. Target area not found
    it('should throw NotFoundException when target area does not exist', async () => {
      const worker = makeUser();
      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(null);

      const dto = makeDto({ target_area_id: 'non-existent-area' });

      await expect(service.reassign(dto, makeSuperadmin())).rejects.toThrow(NotFoundException);
      await expect(service.reassign(dto, makeSuperadmin())).rejects.toThrow('non-existent-area');
    });

    // 5. kepala_rayon can reassign within own rayon
    it('should allow kepala_rayon to reassign worker within own rayon', async () => {
      const kepalaRayon = makeKepalaRayon(RAYON_A);
      // Worker is already in RAYON_A (area A1)
      const worker = makeUser({
        area: makeArea({ id: AREA_A1_ID, name: 'Taman Bungkul', rayon_id: RAYON_A }),
        area_id: AREA_A1_ID,
      });
      // Target area also in RAYON_A
      const targetArea = makeArea({ id: AREA_A2_ID, name: 'Taman Mundu', rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.reassign(dto, kepalaRayon)).resolves.not.toThrow();
    });

    // 6. kepala_rayon forbidden: worker is in a different rayon
    it('should throw ForbiddenException when kepala_rayon tries to reassign worker from different rayon', async () => {
      const kepalaRayon = makeKepalaRayon(RAYON_A);
      // Worker belongs to RAYON_B
      const worker = makeUser({
        area: makeArea({ id: AREA_B1_ID, name: 'Taman Rayon B', rayon_id: RAYON_B }),
        area_id: AREA_B1_ID,
      });
      // Target area is in RAYON_A (same as kepala_rayon)
      const targetArea = makeArea({ id: AREA_A2_ID, name: 'Taman Mundu', rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);

      await expect(service.reassign(dto, kepalaRayon)).rejects.toThrow(ForbiddenException);
      await expect(service.reassign(dto, kepalaRayon)).rejects.toThrow('within your own rayon');
    });

    // 7. kepala_rayon forbidden: target area in different rayon
    it('should throw ForbiddenException when kepala_rayon tries to reassign to area in different rayon', async () => {
      const kepalaRayon = makeKepalaRayon(RAYON_A);
      // Worker is in RAYON_A
      const worker = makeUser({
        area: makeArea({ id: AREA_A1_ID, name: 'Taman Bungkul', rayon_id: RAYON_A }),
        area_id: AREA_A1_ID,
      });
      // Target area is in RAYON_B — cross-rayon move, forbidden
      const targetAreaInRayonB = makeArea({
        id: AREA_B1_ID,
        name: 'Taman Rayon B',
        rayon_id: RAYON_B,
      });
      const dto = makeDto({ target_area_id: AREA_B1_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetAreaInRayonB);

      await expect(service.reassign(dto, kepalaRayon)).rejects.toThrow(ForbiddenException);
    });

    // 8. superadmin can reassign across rayons
    it('should allow superadmin to reassign worker across rayons', async () => {
      const superadmin = makeSuperadmin();
      // Worker is in RAYON_A
      const worker = makeUser({
        area: makeArea({ id: AREA_A1_ID, name: 'Taman Bungkul', rayon_id: RAYON_A }),
        area_id: AREA_A1_ID,
      });
      // Target area is in RAYON_B — cross-rayon, allowed for superadmin
      const targetAreaInRayonB = makeArea({
        id: AREA_B1_ID,
        name: 'Taman Rayon B',
        rayon_id: RAYON_B,
      });
      const dto = makeDto({ target_area_id: AREA_B1_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetAreaInRayonB);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_B1_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.reassign(dto, superadmin)).resolves.not.toThrow();
    });

    // 9. Updates user_tracking_status area_id
    it('should update user_tracking_status area_id to the target area', async () => {
      const worker = makeUser();
      const targetArea = makeArea({ id: AREA_A2_ID, rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      await service.reassign(dto, makeSuperadmin());

      expect(trackingRepository.update).toHaveBeenCalledWith(
        { user_id: worker.id },
        { area_id: AREA_A2_ID },
      );
    });

    // 10. Emits USER_REASSIGNED WebSocket event
    it('should emit USER_REASSIGNED WebSocket event with correct payload', async () => {
      const worker = makeUser({
        area: makeArea({ id: AREA_A1_ID, name: 'Taman Bungkul', rayon_id: RAYON_A }),
        area_id: AREA_A1_ID,
      });
      const targetArea = makeArea({ id: AREA_A2_ID, name: 'Taman Mundu', rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      await service.reassign(dto, makeSuperadmin());

      expect(eventsGateway.emitUserReassigned).toHaveBeenCalledTimes(1);
      expect(eventsGateway.emitUserReassigned).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: worker.id,
          user_name: worker.full_name,
          role: worker.role,
          previous_area_id: AREA_A1_ID,
          previous_area_name: 'Taman Bungkul',
          new_area_id: AREA_A2_ID,
          new_area_name: 'Taman Mundu',
          rayon_id: RAYON_A,
        }),
      );
    });

    // 11. Returns correct response DTO shape
    it('should return a response DTO with all required fields populated', async () => {
      const worker = makeUser({
        area: makeArea({ id: AREA_A1_ID, name: 'Taman Bungkul', rayon_id: RAYON_A }),
        area_id: AREA_A1_ID,
      });
      const targetArea = makeArea({ id: AREA_A2_ID, name: 'Taman Mundu', rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.reassign(dto, makeSuperadmin());

      expect(result).toMatchObject({
        user_id: worker.id,
        user_name: worker.full_name,
        previous_area_id: AREA_A1_ID,
        previous_area_name: 'Taman Bungkul',
        new_area_id: AREA_A2_ID,
        new_area_name: 'Taman Mundu',
        new_schedule_id: 'roster-row-uuid',
      });
      expect(result.effective_date).toBeDefined();
      expect(result.reassigned_at).toBeInstanceOf(Date);
      expect(result.reassigned_at.getTime()).toBeCloseTo(Date.now(), -3);
    });

    // 12. Worker with no current area (null area_id)
    it('should handle worker with no current area and set previous_area fields to null', async () => {
      // Worker has never been assigned to an area
      const workerWithNoArea = makeUser({ area_id: undefined, area: undefined });
      const targetArea = makeArea({ id: AREA_A2_ID, name: 'Taman Mundu', rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(workerWithNoArea);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...workerWithNoArea, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.reassign(dto, makeSuperadmin());

      expect(result.previous_area_id).toBeNull();
      expect(result.previous_area_name).toBeNull();
      expect(result.new_area_id).toBe(AREA_A2_ID);
    });

    // 12b. Worker with null area: WebSocket event also carries null previous fields
    it('should emit USER_REASSIGNED with null previous_area fields when worker had no area', async () => {
      const workerWithNoArea = makeUser({ area_id: undefined, area: undefined });
      const targetArea = makeArea({ id: AREA_A2_ID, name: 'Taman Mundu', rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(workerWithNoArea);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...workerWithNoArea, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      await service.reassign(dto, makeSuperadmin());

      expect(eventsGateway.emitUserReassigned).toHaveBeenCalledWith(
        expect.objectContaining({
          previous_area_id: null,
          previous_area_name: null,
        }),
      );
    });

    // Verify user is fetched with area relation
    it('should fetch worker with area relation to resolve previous area details', async () => {
      const worker = makeUser();
      const targetArea = makeArea();
      const dto = makeDto();

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue(worker);
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      await service.reassign(dto, makeSuperadmin());

      expect(userRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: dto.user_id },
          relations: ['area'],
        }),
      );
    });

    // linmas role is also reassignable
    it('should successfully reassign worker with linmas role', async () => {
      const linmasWorker = makeUser({ role: UserRole.LINMAS });
      const targetArea = makeArea();
      const dto = makeDto();

      userRepository.findOne.mockResolvedValue(linmasWorker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...linmasWorker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.reassign(dto, makeSuperadmin())).resolves.not.toThrow();
    });

    // kepala_rayon: worker with null area (workerRayonId becomes null), should be forbidden
    it('should throw ForbiddenException when kepala_rayon reassigns worker with null area from different rayon context', async () => {
      const kepalaRayon = makeKepalaRayon(RAYON_A);
      // Worker has no area so rayon_id is null — null !== RAYON_A
      const workerWithNoArea = makeUser({ area_id: undefined, area: undefined });
      const targetArea = makeArea({ id: AREA_A2_ID, rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(workerWithNoArea);
      areaRepository.findOne.mockResolvedValue(targetArea);

      await expect(service.reassign(dto, kepalaRayon)).rejects.toThrow(ForbiddenException);
    });

    // Override today's roster with the target area + shift
    it("should override today's roster with the target area and shift", async () => {
      const worker = makeUser();
      const targetArea = makeArea({ id: AREA_A2_ID, rayon_id: RAYON_A });
      const dto = makeDto({
        target_area_id: AREA_A2_ID,
        shift_definition_id: 'shift-def-uuid',
        effective_date: '2026-03-07',
      });
      const superadmin = makeSuperadmin();

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.reassign(dto, superadmin);

      expect(dailySchedulesService.overrideForDay).toHaveBeenCalledWith(
        worker.id,
        '2026-03-07',
        { areaId: AREA_A2_ID, rayonId: RAYON_A, shiftDefinitionId: 'shift-def-uuid' },
        superadmin.id,
      );
      expect(result.new_schedule_id).toBe('roster-row-uuid');
      expect(result.effective_date).toBe('2026-03-07');
    });

    // Effective date defaults to today when not provided
    it('should default effective_date to today when not provided', async () => {
      const worker = makeUser();
      const targetArea = makeArea({ id: AREA_A2_ID, rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.reassign(dto, makeSuperadmin());

      // Default is computed in Asia/Jakarta (Phase 4-7 E1)
      const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
      expect(result.effective_date).toBe(today);
    });

    // ── Audit trail (4-4) ────────────────────────────────────────────────────

    it('should write an audit log entry with old/new area, actor and metadata on success', async () => {
      const worker = makeUser({
        area: makeArea({ id: AREA_A1_ID, name: 'Taman Bungkul', rayon_id: RAYON_A }),
        area_id: AREA_A1_ID,
      });
      const targetArea = makeArea({ id: AREA_A2_ID, name: 'Taman Mundu', rayon_id: RAYON_A });
      const superadmin = makeSuperadmin();
      const dto = makeDto({
        target_area_id: AREA_A2_ID,
        reason: 'Understaffed at target area',
        effective_date: '2026-06-10',
      });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      await service.reassign(dto, superadmin);

      expect(auditLogService.log).toHaveBeenCalledTimes(1);
      expect(auditLogService.log).toHaveBeenCalledWith({
        entity_type: 'user',
        entity_id: worker.id,
        action: 'reassign',
        actor_id: superadmin.id,
        old_value: { area_id: AREA_A1_ID, area_name: 'Taman Bungkul' },
        new_value: { area_id: AREA_A2_ID, area_name: 'Taman Mundu' },
        metadata: {
          reason: 'Understaffed at target area',
          effective_date: '2026-06-10',
          new_schedule_id: 'roster-row-uuid',
        },
      });
    });

    it('should not fail the reassignment when audit logging rejects', async () => {
      const worker = makeUser();
      const targetArea = makeArea({ id: AREA_A2_ID, rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });
      auditLogService.log.mockRejectedValue(new Error('db down'));

      await expect(service.reassign(dto, makeSuperadmin())).resolves.toMatchObject({
        new_area_id: AREA_A2_ID,
      });
    });

    it('should not write an audit log entry when reassignment fails', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.reassign(makeDto(), makeSuperadmin())).rejects.toThrow(
        NotFoundException,
      );
      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    // Roster override carries no shift when shift_definition_id is omitted
    it('should override the roster with no shift when shift_definition_id is not provided', async () => {
      const worker = makeUser();
      const targetArea = makeArea({ id: AREA_A2_ID, rayon_id: RAYON_A });
      const dto = makeDto({ target_area_id: AREA_A2_ID });

      userRepository.findOne.mockResolvedValue(worker);
      areaRepository.findOne.mockResolvedValue(targetArea);
      userRepository.save.mockResolvedValue({ ...worker, area_id: AREA_A2_ID });
      trackingRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.reassign(dto, makeSuperadmin());

      expect(dailySchedulesService.overrideForDay).toHaveBeenCalledWith(
        worker.id,
        expect.any(String),
        expect.objectContaining({ areaId: AREA_A2_ID, shiftDefinitionId: undefined }),
        expect.any(String),
      );
      expect(result.new_schedule_id).toBe('roster-row-uuid');
    });
  });
});
