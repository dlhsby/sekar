/**
 * WebSocket Service Tests (Simplified)
 *
 * Simplified tests that avoid async operations and focus on core functionality.
 */

import websocketService, {
  EventType,
  ConnectionState,
} from '../websocketService';
import * as secureStorage from '../../storage/secureStorage';
import io from 'socket.io-client';

// Mock dependencies
jest.mock('../../storage/secureStorage');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockSocket = (io as any).mockSocket;

describe('websocketService (simplified)', () => {
  beforeEach(() => {
    // Mock token
    mockSecureStorage.getToken.mockResolvedValue('jwt-token-123');

    // Reset mock socket
    mockSocket.connected = false;
    mockSocket.on = jest.fn();
    mockSocket.off = jest.fn();
    mockSocket.emit = jest.fn((event, data, callback) => {
      if (callback) {callback({ success: true });}
    });
    mockSocket.disconnect = jest.fn();

    // Reset service state
    (websocketService as any).socket = null;
    (websocketService as any).connectionState = ConnectionState.DISCONNECTED;
    (websocketService as any).reconnectAttempts = 0;
    (websocketService as any).subscribedRooms = new Set();
    (websocketService as any).eventListeners = new Map();
    (websocketService as any).reconnectConfig = { enabled: false };
  });

  describe('basic functionality', () => {
    it('starts disconnected', () => {
      expect(websocketService.isConnected()).toBe(false);
      expect(websocketService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('returns empty subscribed rooms initially', () => {
      expect(websocketService.getSubscribedRooms()).toEqual([]);
    });

    it('handles disconnect when not connected', () => {
      websocketService.disconnect();
      expect(websocketService.isConnected()).toBe(false);
    });
  });

  describe('when connected', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      (websocketService as any).socket = mockSocket;
      (websocketService as any).connectionState = ConnectionState.CONNECTED;
    });

    it('reports connected status', () => {
      expect(websocketService.isConnected()).toBe(true);
      expect(websocketService.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('subscribes to area', () => {
      websocketService.subscribeToArea('area-123');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'subscribe:area',
        { area_id: 'area-123' },
        expect.any(Function)
      );
      expect(websocketService.getSubscribedRooms()).toContain('area:area-123');
    });

    it('unsubscribes from area', () => {
      websocketService.subscribeToArea('area-123');
      mockSocket.emit.mockClear();

      websocketService.unsubscribeFromArea('area-123');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'unsubscribe:area',
        { area_id: 'area-123' },
        expect.any(Function)
      );
      expect(websocketService.getSubscribedRooms()).not.toContain('area:area-123');
    });

    it('subscribes to rayon', () => {
      websocketService.subscribeToRayon('rayon-456');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'subscribe:rayon',
        { rayon_id: 'rayon-456' },
        expect.any(Function)
      );
      expect(websocketService.getSubscribedRooms()).toContain('rayon:rayon-456');
    });

    it('unsubscribes from rayon', () => {
      websocketService.subscribeToRayon('rayon-456');
      mockSocket.emit.mockClear();

      websocketService.unsubscribeFromRayon('rayon-456');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'unsubscribe:rayon',
        { rayon_id: 'rayon-456' },
        expect.any(Function)
      );
    });

    it('adds event listeners', () => {
      const handler = jest.fn();

      websocketService.onWorkerLocation(handler);

      expect(mockSocket.on).toHaveBeenCalledWith(EventType.WORKER_LOCATION, handler);
    });

    it('removes event listeners', () => {
      const handler = jest.fn();

      const unsubscribe = websocketService.onWorkerLocation(handler);
      unsubscribe();

      expect(mockSocket.off).toHaveBeenCalledWith(EventType.WORKER_LOCATION, handler);
    });

    it('disconnects cleanly', () => {
      websocketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(websocketService.isConnected()).toBe(false);
      expect(websocketService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });
  });

  describe('event listener types', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      (websocketService as any).socket = mockSocket;
    });

    it('onWorkerLocation adds listener', () => {
      const handler = jest.fn();
      const unsubscribe = websocketService.onWorkerLocation(handler);

      expect(typeof unsubscribe).toBe('function');
      expect(mockSocket.on).toHaveBeenCalledWith(EventType.WORKER_LOCATION, handler);
    });

    it('onWorkerClockIn adds listener', () => {
      const handler = jest.fn();
      websocketService.onWorkerClockIn(handler);

      expect(mockSocket.on).toHaveBeenCalledWith(EventType.WORKER_CLOCK_IN, handler);
    });

    it('onWorkerClockOut adds listener', () => {
      const handler = jest.fn();
      websocketService.onWorkerClockOut(handler);

      expect(mockSocket.on).toHaveBeenCalledWith(EventType.WORKER_CLOCK_OUT, handler);
    });

    it('onTaskAssigned adds listener', () => {
      const handler = jest.fn();
      websocketService.onTaskAssigned(handler);

      expect(mockSocket.on).toHaveBeenCalledWith(EventType.TASK_ASSIGNED, handler);
    });

    it('onTaskCompleted adds listener', () => {
      const handler = jest.fn();
      websocketService.onTaskCompleted(handler);

      expect(mockSocket.on).toHaveBeenCalledWith(EventType.TASK_COMPLETED, handler);
    });

    it('onAreaStaffing adds listener', () => {
      const handler = jest.fn();
      websocketService.onAreaStaffing(handler);

      expect(mockSocket.on).toHaveBeenCalledWith(EventType.AREA_STAFFING, handler);
    });
  });

  describe('configuration', () => {
    it('updates reconnect config', () => {
      websocketService.setReconnectConfig({
        maxAttempts: 5,
        initialDelay: 2000,
      });

      const config = (websocketService as any).reconnectConfig;
      expect(config.maxAttempts).toBe(5);
      expect(config.initialDelay).toBe(2000);
    });
  });

  describe('cleanup', () => {
    it('removes all listeners', () => {
      mockSocket.connected = true;
      (websocketService as any).socket = mockSocket;

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      websocketService.onWorkerLocation(handler1);
      websocketService.onWorkerClockIn(handler2);

      websocketService.cleanup();

      expect(mockSocket.off).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});
