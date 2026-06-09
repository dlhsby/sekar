import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationType } from './entities/notification.entity';
import { CONFIGURABLE_NOTIFICATION_TYPES } from './constants/notification-preferences.constants';

export interface NotificationPreferenceState {
  type: NotificationType;
  enabled: boolean;
}

/**
 * Per-user push notification preferences (Phase 4-3, §D1/§D2/§D3).
 *
 * Default-on semantics: an absent row means the type is enabled, so the table
 * only stores explicit opt-outs (and any re-enabled rows). `getForUser` always
 * returns the full configurable set so the mobile screen can render every
 * toggle without inferring defaults.
 */
@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
  ) {}

  /**
   * Return all configurable types with their effective enabled state for a user.
   * Rows that don't exist are synthesized as `enabled: true`.
   */
  async getForUser(userId: string): Promise<NotificationPreferenceState[]> {
    const rows = await this.preferenceRepository.find({ where: { user_id: userId } });
    const byType = new Map(rows.map((r) => [r.notification_type, r.enabled]));
    return CONFIGURABLE_NOTIFICATION_TYPES.map((type) => ({
      type,
      enabled: byType.has(type) ? (byType.get(type) as boolean) : true,
    }));
  }

  /**
   * Bulk-upsert the given preferences. Types outside the configurable set are
   * silently ignored. Returns the full effective state after the update.
   */
  async updateForUser(
    userId: string,
    items: NotificationPreferenceState[],
  ): Promise<NotificationPreferenceState[]> {
    const valid = items.filter((i) => CONFIGURABLE_NOTIFICATION_TYPES.includes(i.type));

    for (const item of valid) {
      const existing = await this.preferenceRepository.findOne({
        where: { user_id: userId, notification_type: item.type },
      });
      if (existing) {
        if (existing.enabled !== item.enabled) {
          existing.enabled = item.enabled;
          await this.preferenceRepository.save(existing);
        }
      } else {
        await this.preferenceRepository.save(
          this.preferenceRepository.create({
            user_id: userId,
            notification_type: item.type,
            enabled: item.enabled,
          }),
        );
      }
    }

    return this.getForUser(userId);
  }

  /**
   * Whether push for a given (user, type) is enabled. Absent row → enabled.
   * Used by `NotificationsService` to gate FCM dispatch. Fail-open: on any
   * lookup error, treat as enabled so a DB hiccup never silences pushes.
   */
  async isEnabled(userId: string, type: NotificationType): Promise<boolean> {
    try {
      const row = await this.preferenceRepository.findOne({
        where: { user_id: userId, notification_type: type },
      });
      return row ? row.enabled : true;
    } catch (err) {
      this.logger.warn(
        `isEnabled lookup failed for user ${userId} type ${type}: ${(err as Error).message}`,
      );
      return true;
    }
  }
}
