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
  EventType,
} from './dto/events.dto';
import { User, UserRole } from '../modules/users/entities/user.entity';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let jwtService: jest.Mocked<JwtService>;
  let mockServer: jest.Mocked<Server>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
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
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
          },
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
      expect(mockClient.join).toHaveBeenCalledWith('city');
    });

    it('should auto-join city room for top_management role', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'manager-1',
        role: UserRole.TOP_MANAGEMENT,
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith(`user:manager-1`);
      expect(mockClient.join).toHaveBeenCalledWith('city');
    });

    it('should not join city room for satgas role', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'worker-1',
        role: UserRole.SATGAS,
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith(`user:worker-1`);
      expect(mockClient.join).not.toHaveBeenCalledWith('city');
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
        area_id: 'area-1',
      });

      expect(mockClient.join).toHaveBeenCalledWith('area:area-1');
      expect(result).toEqual({ success: true, room: 'area:area-1' });
    });
  });

  describe('unsubscribe:area', () => {
    it('should unsubscribe client from area room', () => {
      const result = gateway.handleUnsubscribeArea(mockClient, {
        area_id: 'area-1',
      });

      expect(mockClient.leave).toHaveBeenCalledWith('area:area-1');
      expect(result).toEqual({ success: true, room: 'area:area-1' });
    });
  });

  describe('subscribe:rayon', () => {
    it('should subscribe client to rayon room', () => {
      const result = gateway.handleSubscribeRayon(mockClient, {
        rayon_id: 'rayon-1',
      });

      expect(mockClient.join).toHaveBeenCalledWith('rayon:rayon-1');
      expect(result).toEqual({ success: true, room: 'rayon:rayon-1' });
    });
  });

  describe('unsubscribe:rayon', () => {
    it('should unsubscribe client from rayon room', () => {
      const result = gateway.handleUnsubscribeRayon(mockClient, {
        rayon_id: 'rayon-1',
      });

      expect(mockClient.leave).toHaveBeenCalledWith('rayon:rayon-1');
      expect(result).toEqual({ success: true, room: 'rayon:rayon-1' });
    });
  });

  describe('emitUserLocation', () => {
    const locationEvent: UserLocationEvent = {
      user_id: 'worker-1',
      user_name: 'Worker One',
      role: UserRole.SATGAS,
      shift_id: 'shift-1',
      area_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      latitude: -7.2905,
      longitude: 112.7398,
      accuracy: 10,
      battery_level: 85,
      timestamp: new Date(),
    };

    it('should emit to area room', () => {
      gateway.emitUserLocation(locationEvent);

      expect(mockServer.to).toHaveBeenCalledWith('area:area-1');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.USER_LOCATION, locationEvent);
    });

    it('should emit to rayon room', () => {
      gateway.emitUserLocation(locationEvent);

      expect(mockServer.to).toHaveBeenCalledWith('rayon:rayon-1');
    });

    it('should emit to city room', () => {
      gateway.emitUserLocation(locationEvent);

      expect(mockServer.to).toHaveBeenCalledWith('city');
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...locationEvent, rayon_id: undefined };
      mockServer.to.mockClear();

      gateway.emitUserLocation(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('rayon:'),
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
      area_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      latitude: -7.2905,
      longitude: 112.7398,
      timestamp: new Date(),
    };

    it('should emit clock-in to all relevant rooms', () => {
      gateway.emitUserClockIn(clockInEvent);

      expect(mockServer.to).toHaveBeenCalledWith('area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.USER_CLOCK_IN, clockInEvent);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...clockInEvent, rayon_id: undefined };
      mockServer.to.mockClear();

      gateway.emitUserClockIn(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitUserClockOut', () => {
    const clockOutEvent: UserClockOutEvent = {
      user_id: 'worker-1',
      user_name: 'Worker One',
      shift_id: 'shift-1',
      area_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      timestamp: new Date(),
      duration_minutes: 480,
    };

    it('should emit clock-out to all relevant rooms', () => {
      gateway.emitUserClockOut(clockOutEvent);

      expect(mockServer.to).toHaveBeenCalledWith('area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.USER_CLOCK_OUT, clockOutEvent);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...clockOutEvent, rayon_id: undefined };
      mockServer.to.mockClear();

      gateway.emitUserClockOut(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitAreaStaffing', () => {
    const staffingEvent: AreaStaffingEvent = {
      area_id: 'area-1',
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

      expect(mockServer.to).toHaveBeenCalledWith('area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.AREA_STAFFING, staffingEvent);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...staffingEvent, rayon_id: undefined };
      mockServer.to.mockClear();

      gateway.emitAreaStaffing(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitTaskAssigned', () => {
    const taskAssignedEvent: TaskAssignedEvent = {
      task_id: 'task-1',
      title: 'Water plants',
      area_id: 'area-1',
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

      expect(mockServer.to).toHaveBeenCalledWith('area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.TASK_ASSIGNED, taskAssignedEvent);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...taskAssignedEvent, rayon_id: undefined };
      mockServer.to.mockClear();

      gateway.emitTaskAssigned(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });

    it('should emit to assigned user directly', () => {
      jwtService.verify.mockReturnValue({ sub: 'worker-1', role: UserRole.SATGAS });
      gateway.handleConnection(mockClient);

      gateway.emitTaskAssigned(taskAssignedEvent);

      expect(mockServer.to).toHaveBeenCalledWith(mockClient.id);
    });
  });

  describe('emitTaskCompleted', () => {
    const taskCompletedEvent: TaskCompletedEvent = {
      task_id: 'task-1',
      title: 'Water plants',
      area_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      completed_by: 'worker-1',
      completer_name: 'Worker One',
      timestamp: new Date(),
    };

    it('should emit task completed to all relevant rooms', () => {
      gateway.emitTaskCompleted(taskCompletedEvent);

      expect(mockServer.to).toHaveBeenCalledWith('area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.TASK_COMPLETED, taskCompletedEvent);
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...taskCompletedEvent, rayon_id: undefined };
      mockServer.to.mockClear();

      gateway.emitTaskCompleted(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('rayon:'),
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
      rooms.set('area:area-1', new Set(['client-1']));
      rooms.set('city', new Set(['client-2']));
      rooms.set('client-1', new Set(['client-1'])); // Client ID room — should be excluded
      mockServer.sockets.adapter.rooms = rooms;

      const stats = gateway.getStats();

      expect(stats.totalConnections).toBe(1);
      expect(stats.rooms['area:area-1']).toBe(1);
      expect(stats.rooms['city']).toBe(1);
      expect(stats.rooms['client-1']).toBeUndefined();
    });
  });
});
