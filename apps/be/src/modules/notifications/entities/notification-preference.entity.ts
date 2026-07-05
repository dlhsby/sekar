import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationType } from './notification.entity';

/**
 * Per-user, per-type push notification preference (Phase 4-3, §D1).
 *
 * One row per (user, notification_type) the user has explicitly toggled.
 * Absence of a row means "enabled" — the default-on semantics keep the table
 * sparse (only opt-outs are stored). `NotificationsService.sendToUser()`
 * consults this before dispatching FCM; a disabled type still records the
 * in-app inbox row but skips the push.
 */
@Entity('notification_preferences')
@Unique('UQ_notification_preferences_user_type', ['user_id', 'notification_type'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('IDX_notification_preferences_user')
  user_id: string;

  @Column({ name: 'notification_type', type: 'varchar', length: 50 })
  notification_type: NotificationType;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
