import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Activity } from './activity.entity';
import { User } from '../../users/entities/user.entity';

/**
 * ActivityTag entity — tag involved users on an activity (ADR-038, May 2026).
 *
 * Parallels `task_tags`. Allows the activity owner (e.g. a `korlap` filing a
 * pruning activity that involved several `satgas`) to mark the involved users
 * so the activity surfaces on each of their feeds via
 * `GET /api/v1/activities?involving_me=true`.
 *
 * Owner remains the sole writer (`Activity.user_id`); tagged users gain
 * read-only feed visibility plus an FCM push notification.
 */
@Entity('activity_tags')
@Unique(['activity_id', 'user_id'])
export class ActivityTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  activity_id: string;

  @Column('uuid')
  user_id: string;

  /** User who applied the tag — usually the activity owner. */
  @Column('uuid')
  tagged_by: string;

  @ManyToOne(() => Activity, (activity) => activity.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tagged_by' })
  taggedBy: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}
