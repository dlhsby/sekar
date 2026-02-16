import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  SubscribeAreaDto,
  UnsubscribeAreaDto,
  SubscribeRayonDto,
  UnsubscribeRayonDto,
  UserLocationEvent,
  UserClockInEvent,
  UserClockOutEvent,
  AreaStaffingEvent,
  TaskAssignedEvent,
  TaskCompletedEvent,
  EventType,
} from './dto/events.dto';

/**
 * WebSocket Gateway for real-time events
 *
 * Handles:
 * - Client subscriptions to areas/rayons
 * - Broadcasting location updates
 * - Broadcasting shift events (clock-in/out)
 * - Broadcasting staffing changes
 * - Broadcasting task events
 *
 * Rooms:
 * - area:{areaId} - Subscribers to specific area
 * - rayon:{rayonId} - Subscribers to specific rayon
 * - city - City-wide subscribers (Admin/TopManagement)
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
    credentials: true,
  },
  namespace: '/events',
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly connectedClients = new Map<string, { userId: string; role: string }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle new client connection
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      // Extract and verify JWT token
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Store client info
      this.connectedClients.set(client.id, {
        userId: payload.sub,
        role: payload.role,
      });

      // Auto-join city room for Admin/TopManagement
      if (payload.role === 'Admin' || payload.role === 'TopManagement') {
        client.join('city');
        this.logger.log(`Client ${client.id} (${payload.role}) joined city room`);
      }

      this.logger.log(
        `Client connected: ${client.id} (user: ${payload.sub}, role: ${payload.role})`,
      );
    } catch (error) {
      this.logger.warn(`Client ${client.id} connection rejected: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    const clientInfo = this.connectedClients.get(client.id);
    this.connectedClients.delete(client.id);

    this.logger.log(
      `Client disconnected: ${client.id}${clientInfo ? ` (user: ${clientInfo.userId})` : ''}`,
    );
  }

  /**
   * Subscribe to area events
   */
  @SubscribeMessage('subscribe:area')
  handleSubscribeArea(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SubscribeAreaDto,
  ): { success: boolean; room: string } {
    const room = `area:${dto.area_id}`;
    client.join(room);

    this.logger.log(`Client ${client.id} subscribed to ${room}`);

    return { success: true, room };
  }

  /**
   * Unsubscribe from area events
   */
  @SubscribeMessage('unsubscribe:area')
  handleUnsubscribeArea(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UnsubscribeAreaDto,
  ): { success: boolean; room: string } {
    const room = `area:${dto.area_id}`;
    client.leave(room);

    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);

    return { success: true, room };
  }

  /**
   * Subscribe to rayon events
   */
  @SubscribeMessage('subscribe:rayon')
  handleSubscribeRayon(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SubscribeRayonDto,
  ): { success: boolean; room: string } {
    const room = `rayon:${dto.rayon_id}`;
    client.join(room);

    this.logger.log(`Client ${client.id} subscribed to ${room}`);

    return { success: true, room };
  }

  /**
   * Unsubscribe from rayon events
   */
  @SubscribeMessage('unsubscribe:rayon')
  handleUnsubscribeRayon(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UnsubscribeRayonDto,
  ): { success: boolean; room: string } {
    const room = `rayon:${dto.rayon_id}`;
    client.leave(room);

    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);

    return { success: true, room };
  }

  /**
   * Emit user location update
   */
  emitUserLocation(event: UserLocationEvent): void {
    this.logger.debug(`Emitting user location: ${event.user_id} at ${event.area_name}`);

    // Emit to area subscribers
    this.server.to(`area:${event.area_id}`).emit(EventType.USER_LOCATION, event);

    // Emit to rayon subscribers
    if (event.rayon_id) {
      this.server.to(`rayon:${event.rayon_id}`).emit(EventType.USER_LOCATION, event);
    }

    // Emit to city subscribers
    this.server.to('city').emit(EventType.USER_LOCATION, event);
  }

  /**
   * Emit user clock-in event
   */
  emitUserClockIn(event: UserClockInEvent): void {
    this.logger.log(`Emitting user clock-in: ${event.user_name} at ${event.area_name}`);

    // Emit to area subscribers
    this.server.to(`area:${event.area_id}`).emit(EventType.USER_CLOCK_IN, event);

    // Emit to rayon subscribers
    if (event.rayon_id) {
      this.server.to(`rayon:${event.rayon_id}`).emit(EventType.USER_CLOCK_IN, event);
    }

    // Emit to city subscribers
    this.server.to('city').emit(EventType.USER_CLOCK_IN, event);
  }

  /**
   * Emit user clock-out event
   */
  emitUserClockOut(event: UserClockOutEvent): void {
    this.logger.log(`Emitting user clock-out: ${event.user_name} at ${event.area_name}`);

    // Emit to area subscribers
    this.server.to(`area:${event.area_id}`).emit(EventType.USER_CLOCK_OUT, event);

    // Emit to rayon subscribers
    if (event.rayon_id) {
      this.server.to(`rayon:${event.rayon_id}`).emit(EventType.USER_CLOCK_OUT, event);
    }

    // Emit to city subscribers
    this.server.to('city').emit(EventType.USER_CLOCK_OUT, event);
  }

  /**
   * Emit area staffing update
   */
  emitAreaStaffing(event: AreaStaffingEvent): void {
    this.logger.log(
      `Emitting area staffing: ${event.area_name} - ${event.workers_online}/${event.workers_required}`,
    );

    // Emit to area subscribers
    this.server.to(`area:${event.area_id}`).emit(EventType.AREA_STAFFING, event);

    // Emit to rayon subscribers
    if (event.rayon_id) {
      this.server.to(`rayon:${event.rayon_id}`).emit(EventType.AREA_STAFFING, event);
    }

    // Emit to city subscribers
    this.server.to('city').emit(EventType.AREA_STAFFING, event);
  }

  /**
   * Emit task assigned event
   */
  emitTaskAssigned(event: TaskAssignedEvent): void {
    this.logger.log(`Emitting task assigned: "${event.title}" to ${event.assignee_name}`);

    // Emit to area subscribers
    this.server.to(`area:${event.area_id}`).emit(EventType.TASK_ASSIGNED, event);

    // Emit to rayon subscribers
    if (event.rayon_id) {
      this.server.to(`rayon:${event.rayon_id}`).emit(EventType.TASK_ASSIGNED, event);
    }

    // Emit to city subscribers
    this.server.to('city').emit(EventType.TASK_ASSIGNED, event);

    // Also emit to the specific user
    this.emitToUser(event.assigned_to, EventType.TASK_ASSIGNED, event);
  }

  /**
   * Emit task completed event
   */
  emitTaskCompleted(event: TaskCompletedEvent): void {
    this.logger.log(`Emitting task completed: "${event.title}" by ${event.completer_name}`);

    // Emit to area subscribers
    this.server.to(`area:${event.area_id}`).emit(EventType.TASK_COMPLETED, event);

    // Emit to rayon subscribers
    if (event.rayon_id) {
      this.server.to(`rayon:${event.rayon_id}`).emit(EventType.TASK_COMPLETED, event);
    }

    // Emit to city subscribers
    this.server.to('city').emit(EventType.TASK_COMPLETED, event);
  }

  /**
   * Emit event to a specific user
   */
  private emitToUser(userId: string, event: EventType, data: any): void {
    for (const [clientId, clientInfo] of this.connectedClients) {
      if (clientInfo.userId === userId) {
        this.server.to(clientId).emit(event, data);
      }
    }
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractToken(client: Socket): string | null {
    // Try from auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try from query params
    const token = client.handshake.query.token;
    if (token && typeof token === 'string') {
      return token;
    }

    // Try from auth object
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    return null;
  }

  /**
   * Get connection statistics
   */
  getStats(): { totalConnections: number; rooms: Record<string, number> } {
    const rooms: Record<string, number> = {};

    this.server?.sockets?.adapter?.rooms?.forEach((value, key) => {
      // Skip client IDs (only include named rooms)
      if (!this.connectedClients.has(key)) {
        rooms[key] = value.size;
      }
    });

    return {
      totalConnections: this.connectedClients.size,
      rooms,
    };
  }
}
