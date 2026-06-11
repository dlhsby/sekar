import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Notification type enum
 */
export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_DECLINED = 'task_declined',
  SHIFT_REMINDER = 'shift_reminder',
  REPORT_SUBMITTED = 'report_submitted',
  ANNOUNCEMENT = 'announcement',
  SYSTEM = 'system',
  // Phase 4 sub-phase 4-3 (M2)
  ACTIVITY_APPROVED = 'activity_approved',
  ACTIVITY_REJECTED = 'activity_rejected',
  OVERTIME_APPROVED = 'overtime_approved',
  OVERTIME_REJECTED = 'overtime_rejected',
  MISSING_WORKER_ALERT = 'missing_worker_alert',
  // Phase 4-3 (ADR-038): tagged as an involved user on someone's activity.
  ACTIVITY_TAGGED = 'activity_tagged',
  // Phase 3-8 close-out: daily digest of areas with overdue plant maintenance.
  AREA_PLANT_OVERDUE = 'area_plant_overdue',
}

/**
 * Notification entity for storing notification history
 *
 * Notifications are created when events occur and can be:
 * - Individual notifications to specific users
 * - Broadcast notifications to all users or specific roles
 */
@Entity('notifications')
@Index(['user_id', 'is_read'])
@Index(['user_id', 'created_at'])
@Index(['type'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  read_at: Date | null;

  @Column({ type: 'boolean', default: false })
  is_sent: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fcm_message_id: string | null;

  @Column({ type: 'int', default: 0 })
  send_attempts: number;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
