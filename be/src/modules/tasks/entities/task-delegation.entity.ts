import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Task } from './task.entity';
import { User, UserRole } from '../../users/entities/user.entity';

/**
 * TaskDelegation — append-only audit row for one assignment hop (ADR-038).
 *
 * Created on every successful assign() (initial assignment + reassignments
 * after decline). Roles are snapshotted so a later role change does not
 * rewrite history.
 */
@Entity('task_delegations')
@Index('IDX_task_delegations_task_id_created', ['task_id', 'created_at'])
export class TaskDelegation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  task_id: string;

  @Column({ type: 'uuid', nullable: true })
  from_user_id: string | null;

  @Column('uuid')
  to_user_id: string;

  @Column({ type: 'text', nullable: true })
  from_role: UserRole | null;

  @Column({ type: 'text' })
  to_role: UserRole;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'from_user_id' })
  from_user: User | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_user_id' })
  to_user: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
