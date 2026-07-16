import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Socket, Server } from 'socket.io';
import { EventsGateway } from './events.gateway';
import {
  UserLocationEvent,
  UserClockInEvent,
  UserClockOutEvent,
  AreaStaffingEvent,
  TaskAssignedEvent,
  TaskCompletedEvent,
  UserStatusChangedEvent,
  UserAreaEvent,
  UserReassignedEvent,
  AreaStaffingChangedEvent,
  EventType,
} from './dto/events.dto';
import { TrackingStatus } from '../modules/monitoring/entities/user-tracking-status.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { UserLocationsService } from '../modules/user-locations/user-locations.service';
import { RoomJoinService } from './services/room-join.service';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let jwtService: jest.Mocked<JwtService>;
  let mockServer: jest.Mocked<Server>;
  let mockUserRepository: { findOne: jest.Mock };

  const mockClient = {
    id: 'client-1',
    handshake: {
      headers: { authorization: 'Bearer valid-token' },
      query: {},
      auth: {},
    },
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
  } as unknown as jest.Mocked<Socket>;

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        adapter: {
          rooms: new Map(),
        },
      },
    } as unknown as jest.Mocked<Server>;

    mockUserRepository = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        // Real instance (Phase 4-7 H3) — resolves against the mocks below so the
        // pre-extraction handleConnection assertions exercise identical paths.
        RoomJoinService,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: UserLocationsService,
          useValue: { getPermanentLocationIds: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    jwtService = module.get(JwtService);
    module.get(ConfigService); // Initialize but don't store

    // Inject mock server
    gateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should accept connection with valid JWT token', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        role: UserRole.SATGAS,
      });

      await gateway.handleConnection(mockClient);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection without token', async () => {
      const clientNoToken = {
        ...mockClient,
        id: 'client-2',
        handshake: {
          headers: {},
          query: {},
          auth: {},
        },
        disconnect: jest.fn(),
      } as unknown as Socket;

      await gateway.handleConnection(clientNoToken);

      expect(clientNoToken.disconnect).toHaveBeenCalled();
    });

    it('should reject connection with invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should auto-join city room for superadmin role', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'admin-1',
        role: UserRole.SUPERADMIN,
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith(`user:admin-1`);
      expect(mockClient.join).toHaveBeenCalledWith('monitoring:city');
    });

    it('should auto-join city room for management role', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'manager-1',
        role: UserRole.MANAGEMENT,
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith(`user:manager-1`);
      expect(mockClient.join).toHaveBeenCalledWith('monitoring:city');
    });

    it('should not join city room for satgas role', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'worker-1',
        role: UserRole.SATGAS,
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith(`user:worker-1`);
      expect(mockClient.join).not.toHaveBeenCalledWith('monitoring:city');
    });

    it('should extract token from query params', async () => {
      const clientWithQuery = {
        ...mockClient,
        id: 'client-3',
        handshake: {
          headers: {},
          query: { token: 'query-token' },
          auth: {},
        },
      } as unknown as Socket;

      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        role: UserRole.SATGAS,
      });

      await gateway.handleConnection(clientWithQuery);

      expect(jwtService.verify).toHaveBeenCalledWith('query-token', {
        secret: 'test-secret',
      });
    });

    it('should extract token from auth object', async () => {
      const clientWithAuth = {
        ...mockClient,
        id: 'client-4',
        handshake: {
          headers: {},
          query: {},
          auth: { token: 'auth-token' },
        },
      } as unknown as Socket;

      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        role: UserRole.SATGAS,
      });

      await gateway.handleConnection(clientWithAuth);

      expect(jwtService.verify).toHaveBeenCalledWith('auth-token', {
        secret: 'test-secret',
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect for connected client', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        role: UserRole.SATGAS,
      });

      await gateway.handleConnection(mockClient);
      gateway.handleDisconnect(mockClient);

      // Client removed from connected clients
      const stats = gateway.getStats();
      expect(stats.totalConnections).toBe(0);
    });

    it('should handle disconnect for unknown client', () => {
      const unknownClient = {
        id: 'unknown-client',
      } as unknown as Socket;

      // Should not throw
      gateway.handleDisconnect(unknownClient);
      expect(gateway.getStats().totalConnections).toBe(0);
    });
  });

  describe('subscribe:area', () => {
    it('should subscribe client to area room', () => {
      const result = gateway.handleSubscribeArea(mockClient, {
        location_id: 'area-1',
      });

      expect(mockClient.join).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(result).toEqual({ success: true, room: 'monitoring:area:area-1' });
    });
  });

  describe('unsubscribe:area', () => {
    it('should unsubscribe client from area room', () => {
      const result = gateway.handleUnsubscribeArea(mockClient, {
        location_id: 'area-1',
      });

      expect(mockClient.leave).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(result).toEqual({ success: true, room: 'monitoring:area:area-1' });
    });
  });

  describe('subscribe:rayon', () => {
    it('should subscribe client to rayon room', () => {
      const result = gateway.handleSubscribeRayon(mockClient, {
        rayon_id: 'rayon-1',
      });

      expect(mockClient.join).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(result).toEqual({ success: true, room: 'monitoring:rayon:rayon-1' });
    });
  });

  describe('unsubscribe:rayon', () => {
    it('should unsubscribe client from rayon room', () => {
      const result = gateway.handleUnsubscribeRayon(mockClient, {
        rayon_id: 'rayon-1',
      });

      expect(mockClient.leave).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(result).toEqual({ success: true, room: 'monitoring:rayon:rayon-1' });
    });
  });

  describe('emitUserLocation', () => {
    const locationEvent: UserLocationEvent = {
      user_id: 'worker-1',
      user_name: 'Worker One',
      role: UserRole.SATGAS,
      shift_id: 'shift-1',
      shift_name: 'Shift Pagi',
      location_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      latitude: -7.2905,
      longitude: 112.7398,
      accuracy: 10,
      battery_level: 85,
      status: TrackingStatus.ACTIVE,
      is_within_area: true,
      activity: 'aktif',
      location: 'dalam_area',
      timestamp: new Date(),
    };

    it('should emit to area room', () => {
      gateway.emitUserLocation(locationEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.USER_LOCATION, locationEvent);
    });

    it('should emit to rayon room', () => {
      gateway.emitUserLocation(locationEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
    });

    it('should NOT emit to city room (WS-3: high-frequency location pings excluded)', () => {
      mockServer.to.mockClear();
      gateway.emitUserLocation(locationEvent);

      const cityCalls = (mockServer.to as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'monitoring:city',
      );
      expect(cityCalls.length).toBe(0);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...locationEvent, rayon_id: null };
      mockServer.to.mockClear();

      gateway.emitUserLocation(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('monitoring:rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitUserClockIn', () => {
    const clockInEvent: UserClockInEvent = {
      user_id: 'worker-1',
      user_name: 'Worker One',
      role: UserRole.SATGAS,
      shift_id: 'shift-1',
      location_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      latitude: -7.2905,
      longitude: 112.7398,
      timestamp: new Date(),
    };

    it('should emit clock-in to all relevant rooms', () => {
      gateway.emitUserClockIn(clockInEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.USER_CLOCK_IN, clockInEvent);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...clockInEvent, rayon_id: null };
      mockServer.to.mockClear();

      gateway.emitUserClockIn(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('monitoring:rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitUserClockOut', () => {
    const clockOutEvent: UserClockOutEvent = {
      user_id: 'worker-1',
      user_name: 'Worker One',
      shift_id: 'shift-1',
      location_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      timestamp: new Date(),
      duration_minutes: 480,
    };

    it('should emit clock-out to all relevant rooms', () => {
      gateway.emitUserClockOut(clockOutEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.USER_CLOCK_OUT, clockOutEvent);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...clockOutEvent, rayon_id: null };
      mockServer.to.mockClear();

      gateway.emitUserClockOut(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('monitoring:rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitAreaStaffing', () => {
    const staffingEvent: AreaStaffingEvent = {
      location_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      workers_required: 5,
      workers_online: 3,
      workers_offline: 1,
      is_fully_staffed: false,
      staffing_delta: -2,
      timestamp: new Date(),
    };

    it('should emit staffing update to all relevant rooms', () => {
      gateway.emitAreaStaffing(staffingEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.AREA_STAFFING, staffingEvent);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...staffingEvent, rayon_id: null };
      mockServer.to.mockClear();

      gateway.emitAreaStaffing(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('monitoring:rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitTaskAssigned', () => {
    const taskAssignedEvent: TaskAssignedEvent = {
      task_id: 'task-1',
      title: 'Water plants',
      location_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      assigned_to: 'worker-1',
      assignee_name: 'Worker One',
      priority: 'high',
      deadline: new Date(),
      timestamp: new Date(),
    };

    it('should emit task assigned to all relevant rooms', () => {
      gateway.emitTaskAssigned(taskAssignedEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.TASK_ASSIGNED, taskAssignedEvent);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...taskAssignedEvent, rayon_id: null };
      mockServer.to.mockClear();

      gateway.emitTaskAssigned(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('monitoring:rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });

    it('should emit to assigned user via their per-user room', () => {
      // Targets `user:{id}` (joined on connect) — not the local socket id — so
      // delivery is correct across instances behind the Redis adapter.
      gateway.emitTaskAssigned(taskAssignedEvent);

      expect(mockServer.to).toHaveBeenCalledWith('user:worker-1');
    });
  });

  describe('emitTaskCompleted', () => {
    const taskCompletedEvent: TaskCompletedEvent = {
      task_id: 'task-1',
      title: 'Water plants',
      location_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      completed_by: 'worker-1',
      completer_name: 'Worker One',
      timestamp: new Date(),
    };

    it('should emit task completed to all relevant rooms', () => {
      gateway.emitTaskCompleted(taskCompletedEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.TASK_COMPLETED, taskCompletedEvent);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...taskCompletedEvent, rayon_id: null };
      mockServer.to.mockClear();

      gateway.emitTaskCompleted(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('monitoring:rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('handleConnection - scoped roles', () => {
    let userRepo: any;

    beforeEach(() => {
      userRepo = mockUserRepository;
    });

    it('should auto-join rayon room for kepala_rayon', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'kr-1',
        role: UserRole.KEPALA_RAYON,
      });
      userRepo.findOne.mockResolvedValue({ id: 'kr-1', rayon_id: 'rayon-3', location_id: null });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user:kr-1');
      expect(mockClient.join).toHaveBeenCalledWith('monitoring:rayon:rayon-3');
      expect(mockClient.join).not.toHaveBeenCalledWith('monitoring:city');
    });

    it('should auto-join area room for korlap', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'korlap-1',
        role: UserRole.KORLAP,
      });
      userRepo.findOne.mockResolvedValue({ id: 'korlap-1', rayon_id: null, location_id: 'area-5' });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user:korlap-1');
      expect(mockClient.join).toHaveBeenCalledWith('monitoring:area:area-5');
    });

    it('should handle user not found gracefully for scoped roles', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'unknown-1',
        role: UserRole.KEPALA_RAYON,
      });
      userRepo.findOne.mockResolvedValue(null);

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user:unknown-1');
      // Should not throw, just skip room join
    });

    it('should handle autoJoinScopedRooms error gracefully', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'kr-err',
        role: UserRole.KEPALA_RAYON,
      });
      userRepo.findOne.mockRejectedValue(new Error('DB error'));

      await gateway.handleConnection(mockClient);

      // Should not disconnect, just log warning
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should auto-join rayon room for admin_rayon', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'ad-1',
        role: UserRole.ADMIN_RAYON,
      });
      userRepo.findOne.mockResolvedValue({ id: 'ad-1', rayon_id: 'rayon-2', location_id: null });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('monitoring:rayon:rayon-2');
    });

    it('should auto-join city room for admin_system', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'as-1',
        role: UserRole.ADMIN_SYSTEM,
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('monitoring:city');
    });
  });

  describe('emitUserStatusChanged', () => {
    const statusEvent: UserStatusChangedEvent = {
      user_id: 'user-1',
      user_name: 'Test User',
      role: UserRole.SATGAS,
      location_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      previous_status: TrackingStatus.ACTIVE,
      new_status: TrackingStatus.OFFLINE,
      latitude: -7.29,
      longitude: 112.74,
      activity: 'offline',
      location: 'dalam_area',
      timestamp: new Date(),
    };

    it('should emit to area, rayon, and city rooms', () => {
      gateway.emitUserStatusChanged(statusEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.USER_STATUS_CHANGED, statusEvent);
    });

    it('should skip area room when location_id is null', () => {
      const noAreaEvent = { ...statusEvent, location_id: null };
      mockServer.to.mockClear();

      gateway.emitUserStatusChanged(noAreaEvent);

      const areaCalls = (mockServer.to as jest.Mock).mock.calls.filter((c) =>
        c[0]?.startsWith('monitoring:area:'),
      );
      expect(areaCalls.length).toBe(0);
    });

    it('should skip rayon room when rayon_id is null', () => {
      const noRayonEvent = { ...statusEvent, rayon_id: null };
      mockServer.to.mockClear();

      gateway.emitUserStatusChanged(noRayonEvent);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((c) =>
        c[0]?.startsWith('monitoring:rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitUserLeftArea', () => {
    const leftAreaEvent: UserAreaEvent = {
      user_id: 'user-1',
      user_name: 'Test User',
      role: UserRole.SATGAS,
      location_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      latitude: -7.5,
      longitude: 112.9,
      timestamp: new Date(),
    };

    it('should emit to area, rayon, and city rooms', () => {
      gateway.emitUserLeftArea(leftAreaEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.USER_LEFT_AREA, leftAreaEvent);
    });

    it('should skip rayon room when rayon_id is null', () => {
      const noRayonEvent = { ...leftAreaEvent, rayon_id: null };
      mockServer.to.mockClear();

      gateway.emitUserLeftArea(noRayonEvent);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((c) =>
        c[0]?.startsWith('monitoring:rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitUserEnteredArea', () => {
    it('should emit to area, rayon, and city rooms', () => {
      const event: UserAreaEvent = {
        user_id: 'user-1',
        user_name: 'Test User',
        role: UserRole.SATGAS,
        location_id: 'area-1',
        area_name: 'Taman Bungkul',
        rayon_id: 'rayon-1',
        latitude: -7.29,
        longitude: 112.74,
        timestamp: new Date(),
      };

      gateway.emitUserEnteredArea(event);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.USER_ENTERED_AREA, event);
    });
  });

  describe('emitUserReassigned', () => {
    const reassignedEvent: UserReassignedEvent = {
      user_id: 'user-1',
      user_name: 'Test User',
      role: UserRole.SATGAS,
      previous_area_id: 'area-old',
      previous_area_name: 'Old Location',
      new_area_id: 'area-new',
      new_area_name: 'New Location',
      rayon_id: 'rayon-1',
      timestamp: new Date(),
    };

    it('should emit to old area, new area, rayon, and city rooms', () => {
      gateway.emitUserReassigned(reassignedEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-old');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-new');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.USER_REASSIGNED, reassignedEvent);
    });

    it('should skip old area room when previous_area_id is null', () => {
      const noPrevEvent = { ...reassignedEvent, previous_area_id: null };
      mockServer.to.mockClear();

      gateway.emitUserReassigned(noPrevEvent);

      const areaCalls = (mockServer.to as jest.Mock).mock.calls.filter(
        (c) => c[0] === 'monitoring:area:area-old',
      );
      expect(areaCalls.length).toBe(0);
      // Should still emit to new area
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-new');
    });

    it('should skip rayon room when rayon_id is null', () => {
      const noRayonEvent = { ...reassignedEvent, rayon_id: null };
      mockServer.to.mockClear();

      gateway.emitUserReassigned(noRayonEvent);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((c) =>
        c[0]?.startsWith('monitoring:rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitAreaStaffingChanged', () => {
    const staffingChangedEvent: AreaStaffingChangedEvent = {
      location_id: 'area-1',
      rayon_id: 'rayon-1',
      active_count: 3,
      required_count: 5,
      is_met: false,
      timestamp: new Date(),
    };

    it('should emit to area, rayon, and city rooms', () => {
      gateway.emitAreaStaffingChanged(staffingChangedEvent);

      expect(mockServer.to).toHaveBeenCalledWith('monitoring:area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('monitoring:city');
      expect(mockServer.emit).toHaveBeenCalledWith(
        EventType.AREA_STAFFING_CHANGED,
        staffingChangedEvent,
      );
    });

    it('should skip rayon room when rayon_id is null', () => {
      const noRayonEvent = { ...staffingChangedEvent, rayon_id: null };
      mockServer.to.mockClear();

      gateway.emitAreaStaffingChanged(noRayonEvent);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((c) =>
        c[0]?.startsWith('monitoring:rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return connection statistics', () => {
      const stats = gateway.getStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('rooms');
      expect(stats.totalConnections).toBe(0);
    });

    it('should count rooms excluding client IDs', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', role: UserRole.SATGAS });
      await gateway.handleConnection(mockClient);

      // Simulate rooms in adapter including named rooms and client IDs
      const rooms = new Map<string, Set<string>>();
      rooms.set('monitoring:area:area-1', new Set(['client-1']));
      rooms.set('monitoring:city', new Set(['client-2']));
      rooms.set('client-1', new Set(['client-1'])); // Client ID room — should be excluded
      mockServer.sockets.adapter.rooms = rooms;

      const stats = gateway.getStats();

      expect(stats.totalConnections).toBe(1);
      expect(stats.rooms['monitoring:area:area-1']).toBe(1);
      expect(stats.rooms['monitoring:city']).toBe(1);
      expect(stats.rooms['client-1']).toBeUndefined();
    });
  });
});
