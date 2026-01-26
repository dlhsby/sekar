import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket, Server } from 'socket.io';
import { EventsGateway } from './events.gateway';
import {
  WorkerLocationEvent,
  WorkerClockInEvent,
  WorkerClockOutEvent,
  AreaStaffingEvent,
  TaskAssignedEvent,
  TaskCompletedEvent,
  EventType,
} from './dto/events.dto';
import { UserRole } from '../modules/users/entities/user.entity';

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
        role: 'Worker',
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

    it('should auto-join city room for Admin role', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'admin-1',
        role: 'Admin',
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('city');
    });

    it('should auto-join city room for TopManagement role', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'manager-1',
        role: 'TopManagement',
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('city');
    });

    it('should not join city room for Worker role', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'worker-1',
        role: 'Worker',
      });

      await gateway.handleConnection(mockClient);

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
        role: 'Worker',
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
        role: 'Worker',
      });

      await gateway.handleConnection(clientWithAuth);

      expect(jwtService.verify).toHaveBeenCalledWith('auth-token', {
        secret: 'test-secret',
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect gracefully', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        role: 'Worker',
      });

      await gateway.handleConnection(mockClient);
      gateway.handleDisconnect(mockClient);

      // Should not throw
      expect(true).toBe(true);
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

  describe('emitWorkerLocation', () => {
    const locationEvent: WorkerLocationEvent = {
      worker_id: 'worker-1',
      worker_name: 'Worker One',
      role: UserRole.WORKER,
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
      gateway.emitWorkerLocation(locationEvent);

      expect(mockServer.to).toHaveBeenCalledWith('area:area-1');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.WORKER_LOCATION, locationEvent);
    });

    it('should emit to rayon room', () => {
      gateway.emitWorkerLocation(locationEvent);

      expect(mockServer.to).toHaveBeenCalledWith('rayon:rayon-1');
    });

    it('should emit to city room', () => {
      gateway.emitWorkerLocation(locationEvent);

      expect(mockServer.to).toHaveBeenCalledWith('city');
    });

    it('should not emit to rayon room if rayon_id is null', () => {
      const eventNoRayon = { ...locationEvent, rayon_id: undefined };
      mockServer.to.mockClear();

      gateway.emitWorkerLocation(eventNoRayon);

      const rayonCalls = (mockServer.to as jest.Mock).mock.calls.filter((call) =>
        call[0]?.startsWith('rayon:'),
      );
      expect(rayonCalls.length).toBe(0);
    });
  });

  describe('emitWorkerClockIn', () => {
    const clockInEvent: WorkerClockInEvent = {
      worker_id: 'worker-1',
      worker_name: 'Worker One',
      role: UserRole.WORKER,
      shift_id: 'shift-1',
      area_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      latitude: -7.2905,
      longitude: 112.7398,
      timestamp: new Date(),
    };

    it('should emit clock-in to all relevant rooms', () => {
      gateway.emitWorkerClockIn(clockInEvent);

      expect(mockServer.to).toHaveBeenCalledWith('area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.WORKER_CLOCK_IN, clockInEvent);
    });
  });

  describe('emitWorkerClockOut', () => {
    const clockOutEvent: WorkerClockOutEvent = {
      worker_id: 'worker-1',
      worker_name: 'Worker One',
      shift_id: 'shift-1',
      area_id: 'area-1',
      area_name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      timestamp: new Date(),
      duration_minutes: 480,
    };

    it('should emit clock-out to all relevant rooms', () => {
      gateway.emitWorkerClockOut(clockOutEvent);

      expect(mockServer.to).toHaveBeenCalledWith('area:area-1');
      expect(mockServer.to).toHaveBeenCalledWith('rayon:rayon-1');
      expect(mockServer.to).toHaveBeenCalledWith('city');
      expect(mockServer.emit).toHaveBeenCalledWith(EventType.WORKER_CLOCK_OUT, clockOutEvent);
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
  });

  describe('getStats', () => {
    it('should return connection statistics', () => {
      const stats = gateway.getStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('rooms');
    });
  });
});
