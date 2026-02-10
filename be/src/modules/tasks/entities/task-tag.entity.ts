import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../users/entities/user.entity';

/**
 * TaskTag entity for tagging users in tasks
 *
 * Allows tasks to tag multiple users for notifications/collaboration.
 * Ensures unique task-user pairs via composite unique constraint.
 */
@Entity('task_tags')
@Unique(['task_id', 'user_id'])
export class TaskTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  task_id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => Task, (task) => task.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}
