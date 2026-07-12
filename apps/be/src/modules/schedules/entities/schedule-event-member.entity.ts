import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ScheduleEvent } from './schedule-event.entity';

/**
 * Join table for team event members.
 * Each row represents one invited member of a team schedule event.
 */
@Entity('schedule_event_members')
export class ScheduleEventMember {
  @PrimaryColumn({ type: 'uuid' })
  schedule_event_id: string;

  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => ScheduleEvent, (e) => e.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_event_id' })
  schedule_event: ScheduleEvent;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
