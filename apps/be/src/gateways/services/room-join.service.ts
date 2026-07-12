import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socket } from 'socket.io';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { UserLocationsService } from '../../modules/user-locations/user-locations.service';

/** Roles that watch the whole city */
const CITY_ROLES: string[] = [UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.TOP_MANAGEMENT];

/** Roles scoped to a rayon */
const RAYON_ROLES: string[] = [UserRole.KEPALA_RAYON, UserRole.ADMIN_DATA];

/**
 * RoomJoinService — computes and applies the WebSocket room set for a user
 * (Phase 4-7 H3, extracted from EventsGateway.handleConnection).
 *
 * Rooms:
 * - `user:{userId}` — personal room (basis of the multi-instance-safe
 *   emitToUser pattern, ADR-016)
 * - `monitoring:city` — city-wide roles
 * - `monitoring:rayon:{rayonId}` — rayon-scoped roles
 * - `monitoring:area:{locationId}` — korlap's assigned areas (multi-area aware)
 */
@Injectable()
export class RoomJoinService {
  private readonly logger = new Logger(RoomJoinService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userLocationsService: UserLocationsService,
  ) {}

  /**
   * Compute the full room list for a user. Scoped-room lookups that fail
   * (DB errors) are logged and skipped — connection setup must not break.
   */
  async getRoomsForUser(userId: string, role: string): Promise<string[]> {
    const rooms: string[] = [`user:${userId}`];

    if (CITY_ROLES.includes(role)) {
      rooms.push('monitoring:city');
      return rooms;
    }

    if (!RAYON_ROLES.includes(role) && role !== UserRole.KORLAP) {
      return rooms;
    }

    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'rayon_id', 'location_id'],
      });

      if (!user) return rooms;

      if (RAYON_ROLES.includes(role) && user.rayon_id) {
        rooms.push(`monitoring:rayon:${user.rayon_id}`);
      }

      if (role === UserRole.KORLAP) {
        // Multi-area: all assigned area rooms, falling back to the legacy single area
        const locationIds = await this.userLocationsService.getPermanentLocationIds(userId);
        if (locationIds.length > 0) {
          rooms.push(...locationIds.map((locationId) => `monitoring:area:${locationId}`));
        } else if (user.location_id) {
          rooms.push(`monitoring:area:${user.location_id}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to resolve scoped rooms for user ${userId}: ${error.message}`);
    }

    return rooms;
  }

  /** Join the socket to every room in the list */
  joinRooms(client: Socket, rooms: string[]): void {
    for (const room of rooms) {
      client.join(room);
    }
    this.logger.log(`Client ${client.id} joined rooms: ${rooms.join(', ')}`);
  }
}
