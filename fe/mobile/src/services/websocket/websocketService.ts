/**
 * WebSocket Real-time Service
 *
 * Handles Socket.IO WebSocket connections for real-time events in Phase 2.
 * Connects to backend EventsGateway for live updates.
 *
 * Features:
 * - Authenticated WebSocket connections with JWT
 * - Room subscriptions (areas, rayons, city-wide)
 * - Event listeners for worker tracking and task updates
 * - Auto-reconnect with exponential backoff
 * - Connection state management
 *
 * Note: This service requires socket.io-client to be installed.
 * Install with: npm install socket.io-client
 */

import { getToken } from '../storage/secureStorage';
import config from '../../constants/config';

/**
 * Event type enumeration (matches backend EventType)
 */
export enum EventType {
  WORKER_LOCATION = 'worker:location',
  WORKER_CLOCK_IN = 'worker:clock-in',
  WORKER_CLOCK_OUT = 'worker:clock-out',
  AREA_STAFFING = 'area:staffing',
  TASK_ASSIGNED = 'task:assigned',
  TASK_COMPLETED = 'task:completed',
}

/**
 * Worker location event data
 */
export interface WorkerLocationEvent {
  worker_id: string;
  worker_name: string;
  role: string;
  shift_id: string;
  area_id: string;
  area_name: string;
  rayon_id?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  battery_level?: number;
  timestamp: Date | string;
}

/**
 * Worker clock-in event data
 */
export interface WorkerClockInEvent {
  worker_id: string;
  worker_name: string;
  role: string;
  shift_id: string;
  area_id: string;
  area_name: string;
  rayon_id?: string;
  latitude: number;
  longitude: number;
  timestamp: Date | string;
}

/**
 * Worker clock-out event data
 */
export interface WorkerClockOutEvent {
  worker_id: string;
  worker_name: string;
  shift_id: string;
  area_id: string;
  area_name: string;
  rayon_id?: string;
  timestamp: Date | string;
  duration_minutes: number;
}

/**
 * Area staffing event data
 */
export interface AreaStaffingEvent {
  area_id: string;
  area_name: string;
  rayon_id?: string;
  workers_required: number;
  workers_online: number;
  workers_offline: number;
  is_fully_staffed: boolean;
  staffing_delta: number;
  timestamp: Date | string;
}

/**
 * Task assigned event data
 */
export interface TaskAssignedEvent {
  task_id: string;
  title: string;
  area_id: string;
  area_name: string;
  rayon_id?: string;
  assigned_to: string;
  assignee_name: string;
  priority: string;
  deadline?: Date | string;
  timestamp: Date | string;
}

/**
 * Task completed event data
 */
export interface TaskCompletedEvent {
  task_id: string;
  title: string;
  area_id: string;
  area_name: string;
  rayon_id?: string;
  completed_by: string;
  completer_name: string;
  timestamp: Date | string;
}

/**
 * Event handler callback types
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * Connection state
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Reconnection configuration
 */
interface ReconnectConfig {
  enabled: boolean;
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * WebSocket Service Class
 *
 * Manages Socket.IO WebSocket connection for real-time events.
 * Requires socket.io-client package.
 */
class WebSocketService {
  private socket: any = null;
  private io: any = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscribedRooms = new Set<string>();
  private eventListeners = new Map<string, Set<EventHandler>>();

  /**
   * Reconnection configuration with exponential backoff
   */
  private reconnectConfig: ReconnectConfig = {
    enabled: true,
    maxAttempts: 10,
    initialDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 1.5,
  };

  /**
   * Connect to WebSocket server with JWT authentication
   *
   * @param token - Optional JWT token (will fetch from storage if not provided)
   */
  async connect(token?: string): Promise<boolean> {
    try {
      // Dynamically import socket.io-client
      const socketIO = await import('socket.io-client');
      this.io = socketIO.default || socketIO;

      const authToken = token || await getToken();

      if (!authToken) {
        console.error('[WebSocket] No authentication token available');
        this.connectionState = ConnectionState.ERROR;
        return false;
      }

      if (this.socket?.connected) {
        console.log('[WebSocket] Already connected');
        return true;
      }

      console.log('[WebSocket] Connecting to server');
      this.connectionState = ConnectionState.CONNECTING;

      // Extract base URL without /api/v1 path
      const baseUrl = config.API_BASE_URL.replace(/\/api\/.*$/, '');

      // Connect to /events namespace with JWT in auth
      this.socket = this.io(`${baseUrl}/events`, {
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
        reconnection: this.reconnectConfig.enabled,
        reconnectionAttempts: this.reconnectConfig.maxAttempts,
        reconnectionDelay: this.reconnectConfig.initialDelay,
        reconnectionDelayMax: this.reconnectConfig.maxDelay,
        timeout: 10000,
      });

      this.setupSocketListeners();

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.error('[WebSocket] Connection timeout');
          this.connectionState = ConnectionState.ERROR;
          resolve(false);
        }, 10000);

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve(true);
        });

        this.socket.once('connect_error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      console.warn('[WebSocket] socket.io-client not available. Install with: npm install socket.io-client');
      this.connectionState = ConnectionState.ERROR;
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (!this.socket) {
      console.log('[WebSocket] Already disconnected');
      return;
    }

    console.log('[WebSocket] Disconnecting');

    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Unsubscribe from all rooms
    this.subscribedRooms.clear();

    // Disconnect socket
    this.socket.disconnect();
    this.socket = null;

    this.connectionState = ConnectionState.DISCONNECTED;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected to WebSocket server
   *
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current connection state
   *
   * @returns Connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Subscribe to area events
   *
   * @param areaId - Area UUID to subscribe to
   */
  subscribeToArea(areaId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot subscribe to area');
      return;
    }

    const room = `area:${areaId}`;

    if (this.subscribedRooms.has(room)) {
      console.log('[WebSocket] Already subscribed to', room);
      return;
    }

    console.log('[WebSocket] Subscribing to area:', areaId);

    this.socket.emit('subscribe:area', { area_id: areaId }, (response: any) => {
      if (response?.success) {
        this.subscribedRooms.add(room);
        console.log('[WebSocket] Subscribed to area:', areaId);
      } else {
        console.error('[WebSocket] Failed to subscribe to area:', response);
      }
    });
  }

  /**
   * Unsubscribe from area events
   *
   * @param areaId - Area UUID to unsubscribe from
   */
  unsubscribeFromArea(areaId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot unsubscribe from area');
      return;
    }

    const room = `area:${areaId}`;

    if (!this.subscribedRooms.has(room)) {
      console.log('[WebSocket] Not subscribed to', room);
      return;
    }

    console.log('[WebSocket] Unsubscribing from area:', areaId);

    this.socket.emit('unsubscribe:area', { area_id: areaId }, (response: any) => {
      if (response?.success) {
        this.subscribedRooms.delete(room);
        console.log('[WebSocket] Unsubscribed from area:', areaId);
      } else {
        console.error('[WebSocket] Failed to unsubscribe from area:', response);
      }
    });
  }

  /**
   * Subscribe to rayon events
   *
   * @param rayonId - Rayon UUID to subscribe to
   */
  subscribeToRayon(rayonId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot subscribe to rayon');
      return;
    }

    const room = `rayon:${rayonId}`;

    if (this.subscribedRooms.has(room)) {
      console.log('[WebSocket] Already subscribed to', room);
      return;
    }

    console.log('[WebSocket] Subscribing to rayon:', rayonId);

    this.socket.emit('subscribe:rayon', { rayon_id: rayonId }, (response: any) => {
      if (response?.success) {
        this.subscribedRooms.add(room);
        console.log('[WebSocket] Subscribed to rayon:', rayonId);
      } else {
        console.error('[WebSocket] Failed to subscribe to rayon:', response);
      }
    });
  }

  /**
   * Unsubscribe from rayon events
   *
   * @param rayonId - Rayon UUID to unsubscribe from
   */
  unsubscribeFromRayon(rayonId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot unsubscribe from rayon');
      return;
    }

    const room = `rayon:${rayonId}`;

    if (!this.subscribedRooms.has(room)) {
      console.log('[WebSocket] Not subscribed to', room);
      return;
    }

    console.log('[WebSocket] Unsubscribing from rayon:', rayonId);

    this.socket.emit('unsubscribe:rayon', { rayon_id: rayonId }, (response: any) => {
      if (response?.success) {
        this.subscribedRooms.delete(room);
        console.log('[WebSocket] Unsubscribed from rayon:', rayonId);
      } else {
        console.error('[WebSocket] Failed to unsubscribe from rayon:', response);
      }
    });
  }

  /**
   * Add listener for worker location updates
   *
   * @param handler - Callback function to handle location updates
   * @returns Unsubscribe function
   */
  onWorkerLocation(handler: EventHandler<WorkerLocationEvent>): () => void {
    return this.addEventListener(EventType.WORKER_LOCATION, handler);
  }

  /**
   * Add listener for worker clock-in events
   *
   * @param handler - Callback function to handle clock-in events
   * @returns Unsubscribe function
   */
  onWorkerClockIn(handler: EventHandler<WorkerClockInEvent>): () => void {
    return this.addEventListener(EventType.WORKER_CLOCK_IN, handler);
  }

  /**
   * Add listener for worker clock-out events
   *
   * @param handler - Callback function to handle clock-out events
   * @returns Unsubscribe function
   */
  onWorkerClockOut(handler: EventHandler<WorkerClockOutEvent>): () => void {
    return this.addEventListener(EventType.WORKER_CLOCK_OUT, handler);
  }

  /**
   * Add listener for task assigned events
   *
   * @param handler - Callback function to handle task assignment
   * @returns Unsubscribe function
   */
  onTaskAssigned(handler: EventHandler<TaskAssignedEvent>): () => void {
    return this.addEventListener(EventType.TASK_ASSIGNED, handler);
  }

  /**
   * Add listener for task completed events
   *
   * @param handler - Callback function to handle task completion
   * @returns Unsubscribe function
   */
  onTaskCompleted(handler: EventHandler<TaskCompletedEvent>): () => void {
    return this.addEventListener(EventType.TASK_COMPLETED, handler);
  }

  /**
   * Add listener for area staffing updates
   *
   * @param handler - Callback function to handle staffing changes
   * @returns Unsubscribe function
   */
  onAreaStaffing(handler: EventHandler<AreaStaffingEvent>): () => void {
    return this.addEventListener(EventType.AREA_STAFFING, handler);
  }

  /**
   * Setup socket event listeners for connection lifecycle
   */
  private setupSocketListeners(): void {
    if (!this.socket) {return;}

    // Connection established
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected to server');
      this.connectionState = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;

      // Resubscribe to previously subscribed rooms
      this.resubscribeToRooms();
    });

    // Connection error
    this.socket.on('connect_error', (error: Error) => {
      console.error('[WebSocket] Connection error:', error.message);
      this.connectionState = ConnectionState.ERROR;

      // Attempt reconnection with exponential backoff
      this.scheduleReconnect();
    });

    // Disconnection
    this.socket.on('disconnect', (reason: string) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.connectionState = ConnectionState.DISCONNECTED;

      // Auto-reconnect if not a manual disconnect
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attempt: number) => {
      console.log('[WebSocket] Reconnection attempt:', attempt);
      this.connectionState = ConnectionState.RECONNECTING;
      this.reconnectAttempts = attempt;
    });

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      console.error('[WebSocket] Reconnection failed after max attempts');
      this.connectionState = ConnectionState.ERROR;
    });

    // Reconnected successfully
    this.socket.on('reconnect', () => {
      console.log('[WebSocket] Reconnected successfully');
      this.connectionState = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.reconnectConfig.enabled) {return;}

    if (this.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.connectionState = ConnectionState.ERROR;
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectConfig.initialDelay *
        Math.pow(this.reconnectConfig.backoffMultiplier, this.reconnectAttempts),
      this.reconnectConfig.maxDelay
    );

    console.log(`[WebSocket] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      await this.connect();
    }, delay);
  }

  /**
   * Resubscribe to all previously subscribed rooms after reconnection
   */
  private resubscribeToRooms(): void {
    if (this.subscribedRooms.size === 0) {return;}

    console.log('[WebSocket] Resubscribing to', this.subscribedRooms.size, 'rooms');

    this.subscribedRooms.forEach((room) => {
      if (room.startsWith('area:')) {
        const areaId = room.replace('area:', '');
        this.subscribedRooms.delete(room); // Remove to avoid duplicate check
        this.subscribeToArea(areaId);
      } else if (room.startsWith('rayon:')) {
        const rayonId = room.replace('rayon:', '');
        this.subscribedRooms.delete(room); // Remove to avoid duplicate check
        this.subscribeToRayon(rayonId);
      }
    });
  }

  /**
   * Add event listener for specific event type
   *
   * @param eventType - Event type to listen for
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  private addEventListener<T = any>(
    eventType: EventType,
    handler: EventHandler<T>
  ): () => void {
    if (!this.socket) {
      console.warn('[WebSocket] Socket not initialized, listener may not work');
    }

    // Add to local registry
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    const handlers = this.eventListeners.get(eventType)!;
    handlers.add(handler);

    // Register with socket if connected
    if (this.socket) {
      this.socket.on(eventType, handler);
    }

    console.log('[WebSocket] Added listener for', eventType);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);

      if (this.socket) {
        this.socket.off(eventType, handler);
      }

      console.log('[WebSocket] Removed listener for', eventType);
    };
  }

  /**
   * Remove all listeners for a specific event type
   *
   * @param eventType - Event type to remove listeners for
   */
  removeAllListeners(eventType?: EventType): void {
    if (eventType) {
      // Remove listeners for specific event
      const handlers = this.eventListeners.get(eventType);
      if (handlers) {
        handlers.forEach(handler => {
          if (this.socket) {
            this.socket.off(eventType, handler);
          }
        });
        this.eventListeners.delete(eventType);
      }
      console.log('[WebSocket] Removed all listeners for', eventType);
    } else {
      // Remove all listeners
      this.eventListeners.forEach((handlers, event) => {
        handlers.forEach(handler => {
          if (this.socket) {
            this.socket.off(event, handler);
          }
        });
      });
      this.eventListeners.clear();
      console.log('[WebSocket] Removed all event listeners');
    }
  }

  /**
   * Get list of subscribed rooms
   *
   * @returns Array of subscribed room names
   */
  getSubscribedRooms(): string[] {
    return Array.from(this.subscribedRooms);
  }

  /**
   * Update reconnection configuration
   *
   * @param config - Partial reconnection configuration
   */
  setReconnectConfig(config: Partial<ReconnectConfig>): void {
    this.reconnectConfig = {
      ...this.reconnectConfig,
      ...config,
    };
    console.log('[WebSocket] Reconnect config updated:', this.reconnectConfig);
  }

  /**
   * Manually trigger reconnection
   */
  async reconnect(): Promise<boolean> {
    console.log('[WebSocket] Manual reconnect triggered');

    if (this.socket?.connected) {
      this.disconnect();
    }

    this.reconnectAttempts = 0;
    return await this.connect();
  }

  /**
   * Cleanup and remove all listeners
   */
  cleanup(): void {
    console.log('[WebSocket] Cleaning up service');

    this.removeAllListeners();
    this.disconnect();
  }
}

/**
 * Singleton instance
 */
const websocketService = new WebSocketService();

export default websocketService;
