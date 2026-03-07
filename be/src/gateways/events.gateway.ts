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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../modules/users/entities/user.entity';
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
  UserStatusChangedEvent,
  UserAreaEvent,
  UserReassignedEvent,
  AreaStaffingChangedEvent,
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

      // Auto-join personal room
      client.join(`user:${payload.sub}`);

      // Auto-join rooms based on role
      const cityRoles = [UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.TOP_MANAGEMENT];
      if (cityRoles.includes(payload.role)) {
        client.join('monitoring:city');
        this.logger.log(`Client ${client.id} (${payload.role}) joined monitoring:city room`);
      }

      // Auto-join rayon/area rooms for scoped roles
      if (
        payload.role === UserRole.KEPALA_RAYON ||
        payload.role === UserRole.ADMIN_DATA ||
        payload.role === UserRole.KORLAP
      ) {
        await this.autoJoinScopedRooms(client, payload.sub, payload.role);
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
    const room = `monitoring:area:${dto.area_id}`;
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
    const room = `monitoring:area:${dto.area_id}`;
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
    const room = `monitoring:rayon:${dto.rayon_id}`;
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
    const room = `monitoring:rayon:${dto.rayon_id}`;
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
    this.server.to(`monitoring:area:${event.area_id}`).emit(EventType.USER_LOCATION, event);

    // Emit to rayon subscribers
    if (event.rayon_id) {
      this.server.to(`monitoring:rayon:${event.rayon_id}`).emit(EventType.USER_LOCATION, event);
    }

    // WS-3: City room does NOT receive high-frequency USER_LOCATION pings
  }

  /**
   * Emit user clock-in event
   */
  emitUserClockIn(event: UserClockInEvent): void {
    this.logger.log(`Emitting user clock-in: ${event.user_name} at ${event.area_name}`);

    this.server.to(`monitoring:area:${event.area_id}`).emit(EventType.USER_CLOCK_IN, event);
    if (event.rayon_id) {
      this.server.to(`monitoring:rayon:${event.rayon_id}`).emit(EventType.USER_CLOCK_IN, event);
    }
    this.server.to('monitoring:city').emit(EventType.USER_CLOCK_IN, event);
  }

  /**
   * Emit user clock-out event
   */
  emitUserClockOut(event: UserClockOutEvent): void {
    this.logger.log(`Emitting user clock-out: ${event.user_name} at ${event.area_name}`);

    this.server.to(`monitoring:area:${event.area_id}`).emit(EventType.USER_CLOCK_OUT, event);
    if (event.rayon_id) {
      this.server.to(`monitoring:rayon:${event.rayon_id}`).emit(EventType.USER_CLOCK_OUT, event);
    }
    this.server.to('monitoring:city').emit(EventType.USER_CLOCK_OUT, event);
  }

  /**
   * Emit area staffing update
   */
  emitAreaStaffing(event: AreaStaffingEvent): void {
    this.logger.log(
      `Emitting area staffing: ${event.area_name} - ${event.workers_online}/${event.workers_required}`,
    );

    this.server.to(`monitoring:area:${event.area_id}`).emit(EventType.AREA_STAFFING, event);
    if (event.rayon_id) {
      this.server.to(`monitoring:rayon:${event.rayon_id}`).emit(EventType.AREA_STAFFING, event);
    }
    this.server.to('monitoring:city').emit(EventType.AREA_STAFFING, event);
  }

  /**
   * Emit task assigned event
   */
  emitTaskAssigned(event: TaskAssignedEvent): void {
    this.logger.log(`Emitting task assigned: "${event.title}" to ${event.assignee_name}`);

    this.server.to(`monitoring:area:${event.area_id}`).emit(EventType.TASK_ASSIGNED, event);
    if (event.rayon_id) {
      this.server.to(`monitoring:rayon:${event.rayon_id}`).emit(EventType.TASK_ASSIGNED, event);
    }
    this.server.to('monitoring:city').emit(EventType.TASK_ASSIGNED, event);

    // Also emit to the specific user
    this.emitToUser(event.assigned_to, EventType.TASK_ASSIGNED, event);
  }

  /**
   * Emit task completed event
   */
  emitTaskCompleted(event: TaskCompletedEvent): void {
    this.logger.log(`Emitting task completed: "${event.title}" by ${event.completer_name}`);

    this.server.to(`monitoring:area:${event.area_id}`).emit(EventType.TASK_COMPLETED, event);
    if (event.rayon_id) {
      this.server.to(`monitoring:rayon:${event.rayon_id}`).emit(EventType.TASK_COMPLETED, event);
    }
    this.server.to('monitoring:city').emit(EventType.TASK_COMPLETED, event);
  }

  /**
   * Emit user status changed event (Phase 2D)
   *
   * Broadcasts to the user's area, rayon, and city rooms.
   */
  emitUserStatusChanged(event: UserStatusChangedEvent): void {
    this.logger.log(
      `Status change: ${event.user_name} ${event.previous_status} → ${event.new_status}`,
    );

    if (event.area_id) {
      this.server.to(`monitoring:area:${event.area_id}`).emit(EventType.USER_STATUS_CHANGED, event);
    }
    if (event.rayon_id) {
      this.server
        .to(`monitoring:rayon:${event.rayon_id}`)
        .emit(EventType.USER_STATUS_CHANGED, event);
    }
    this.server.to('monitoring:city').emit(EventType.USER_STATUS_CHANGED, event);
  }

  /**
   * Emit user left area event (Phase 2D)
   */
  emitUserLeftArea(event: UserAreaEvent): void {
    this.logger.log(`User left area: ${event.user_name} left ${event.area_name}`);

    this.server.to(`monitoring:area:${event.area_id}`).emit(EventType.USER_LEFT_AREA, event);
    if (event.rayon_id) {
      this.server.to(`monitoring:rayon:${event.rayon_id}`).emit(EventType.USER_LEFT_AREA, event);
    }
    this.server.to('monitoring:city').emit(EventType.USER_LEFT_AREA, event);
  }

  /**
   * Emit user entered area event (Phase 2D)
   */
  emitUserEnteredArea(event: UserAreaEvent): void {
    this.logger.log(`User entered area: ${event.user_name} entered ${event.area_name}`);

    this.server.to(`monitoring:area:${event.area_id}`).emit(EventType.USER_ENTERED_AREA, event);
    if (event.rayon_id) {
      this.server.to(`monitoring:rayon:${event.rayon_id}`).emit(EventType.USER_ENTERED_AREA, event);
    }
    this.server.to('monitoring:city').emit(EventType.USER_ENTERED_AREA, event);
  }

  /**
   * Emit user reassigned event (Phase 2D)
   */
  emitUserReassigned(event: UserReassignedEvent): void {
    this.logger.log(`User reassigned: ${event.user_name} to ${event.new_area_name}`);

    if (event.previous_area_id) {
      this.server
        .to(`monitoring:area:${event.previous_area_id}`)
        .emit(EventType.USER_REASSIGNED, event);
    }
    this.server.to(`monitoring:area:${event.new_area_id}`).emit(EventType.USER_REASSIGNED, event);
    if (event.rayon_id) {
      this.server.to(`monitoring:rayon:${event.rayon_id}`).emit(EventType.USER_REASSIGNED, event);
    }
    this.server.to('monitoring:city').emit(EventType.USER_REASSIGNED, event);
  }

  /**
   * Emit area staffing changed event (Phase 2D)
   *
   * Triggered when a status change causes area staffing to cross threshold.
   */
  emitAreaStaffingChanged(event: AreaStaffingChangedEvent): void {
    this.logger.log(
      `Area staffing changed: area ${event.area_id} - ${event.active_count}/${event.required_count} (met: ${event.is_met})`,
    );

    this.server.to(`monitoring:area:${event.area_id}`).emit(EventType.AREA_STAFFING_CHANGED, event);
    if (event.rayon_id) {
      this.server
        .to(`monitoring:rayon:${event.rayon_id}`)
        .emit(EventType.AREA_STAFFING_CHANGED, event);
    }
    this.server.to('monitoring:city').emit(EventType.AREA_STAFFING_CHANGED, event);
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
   * Auto-join rayon/area rooms based on user's assigned scope
   */
  private async autoJoinScopedRooms(client: Socket, userId: string, role: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'rayon_id', 'area_id'],
      });

      if (!user) return;

      if ((role === UserRole.KEPALA_RAYON || role === UserRole.ADMIN_DATA) && user.rayon_id) {
        client.join(`monitoring:rayon:${user.rayon_id}`);
        this.logger.log(`Client ${client.id} auto-joined monitoring:rayon:${user.rayon_id}`);
      }

      if (role === UserRole.KORLAP && user.area_id) {
        client.join(`monitoring:area:${user.area_id}`);
        this.logger.log(`Client ${client.id} auto-joined monitoring:area:${user.area_id}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to auto-join rooms for user ${userId}: ${error.message}`);
    }
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
