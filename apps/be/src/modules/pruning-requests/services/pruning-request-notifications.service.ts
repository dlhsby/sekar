import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PruningRequest } from '../entities/pruning-request.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';

/**
 * Best-effort push notifications for the pruning-request lifecycle. Every
 * method logs failures and never throws — a dropped push must not abort the
 * business operation that triggered it.
 */
@Injectable()
export class PruningRequestNotificationsService {
  private readonly logger = new Logger(PruningRequestNotificationsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Notify every admin_rayon + kepala_rayon in `rayonId` about a state change
   * on `request`. Used on submit, cancel — anywhere the kecamatan-side
   * surface changes and admins need a heads-up without polling the queue.
   */
  async notifyRayonAdmins(
    rayonId: string | null,
    title: string,
    body: string,
    request: PruningRequest,
  ): Promise<void> {
    if (!rayonId) {
      this.logger.warn(`Skipping rayon-admin notification for request ${request.id} — no rayon_id`);
      return;
    }
    try {
      const admins = await this.findActiveRayonAdmins(rayonId);
      if (admins.length === 0) {
        this.logger.warn(
          `No active admin_rayon/kepala_rayon found for rayon ${rayonId} (request ${request.referenceCode})`,
        );
        return;
      }
      await Promise.all(admins.map((admin) => this.pushToAdmin(admin.id, title, body, request)));
    } catch (err) {
      this.logger.error(
        `notifyRayonAdmins lookup failed for rayon ${rayonId}: ${(err as Error).message}`,
      );
    }
  }

  /** Notify the request submitter (kecamatan side) about a state change. */
  async notifySubmitter(request: PruningRequest, title: string, body: string): Promise<void> {
    if (!request.submittedBy) return;
    this.notificationsService
      .sendToUser({
        user_id: request.submittedBy,
        type: NotificationType.TASK_UPDATED,
        title,
        body,
        data: { pruning_request_id: request.id, reference_code: request.referenceCode },
      })
      .catch((err) =>
        this.logger.warn(
          `notifySubmitter push failed (submitter ${request.submittedBy}, request ${request.id}): ${err.message}`,
        ),
      );
  }

  /**
   * TASK_ASSIGNED push to a task assignee (assign-to-task + reschedule
   * cascades). `label` names the operation in the failure log.
   */
  notifyAssignee(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string>,
    label: string,
  ): void {
    this.notificationsService
      .sendToUser({
        user_id: userId,
        title,
        body,
        type: NotificationType.TASK_ASSIGNED,
        data,
      })
      .catch((err) =>
        this.logger.error(`Failed to send ${label} notification: ${(err as Error).message}`),
      );
  }

  private findActiveRayonAdmins(rayonId: string): Promise<User[]> {
    return this.userRepository.find({
      where: [
        { rayon_id: rayonId, role: UserRole.ADMIN_RAYON, is_active: true },
        { rayon_id: rayonId, role: UserRole.KEPALA_RAYON, is_active: true },
      ],
      select: ['id'],
    });
  }

  private pushToAdmin(
    adminId: string,
    title: string,
    body: string,
    request: PruningRequest,
  ): Promise<unknown> {
    return this.notificationsService
      .sendToUser({
        user_id: adminId,
        type: NotificationType.TASK_UPDATED,
        title,
        body,
        data: { pruning_request_id: request.id, reference_code: request.referenceCode },
      })
      .catch((err) =>
        this.logger.warn(
          `notifyRayonAdmins push failed (admin ${adminId}, request ${request.id}): ${err.message}`,
        ),
      );
  }
}
