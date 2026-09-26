import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type AuditOutcome = 'success' | 'denied' | 'failed';
export type AuditSource = 'api' | 'system';

/**
 * Append-only audit trail (ADR-015, extended by ADR-061).
 *
 * Rows are immutable: a DB trigger rejects UPDATE/DELETE/TRUNCATE except the
 * one-time sealing step that fills `prev_hash`/`hash`/`sealed_at` (the hash
 * chain, computed in SQL by `audit_seal()` so it is byte-for-byte reproducible
 * by `audit_verify()`). Actor and entity names are SNAPSHOTS — they stay true to
 * the moment of the action even if the user/entity is renamed or deleted.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_created_at', ['created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Monotonic insertion order; the hash chain follows it. DB-assigned. */
  @Column({ type: 'bigint', insert: false, update: false, nullable: true })
  seq: string;

  @Column({ length: 50 })
  entity_type: string;

  /** Null for events without a single target row (login, denied request). */
  @Column({ type: 'uuid', nullable: true })
  entity_id: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  entity_label: string | null;

  @Column({ length: 50 })
  action: string;

  /** Null for system/cron actions. */
  @Column({ type: 'uuid', nullable: true })
  actor_id: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  actor_role: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  actor_name: string | null;

  @Column({ type: 'jsonb', nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- free-form JSONB read by many domain consumers
  old_value: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- free-form JSONB read by many domain consumers
  new_value: Record<string, any> | null;

  /** Field diff `{ field: [old, new] }` for updates. */
  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, [unknown, unknown]> | null;

  @Column({ type: 'jsonb', nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- free-form JSONB read by many domain consumers
  metadata: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 10, default: 'success' })
  outcome: AuditOutcome;

  @Column({ type: 'varchar', length: 10, default: 'api' })
  source: AuditSource;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  user_agent: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  request_id: string | null;

  /** Root row of a cascade (e.g. a force delete and its dependent changes). */
  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  /** Position in the hash chain, assigned at sealing (commit order ≠ seq order). */
  @Column({ type: 'bigint', nullable: true, insert: false, update: false })
  chain_pos: string | null;

  @Column({ type: 'char', length: 64, nullable: true, insert: false, update: false })
  prev_hash: string | null;

  @Column({ type: 'char', length: 64, nullable: true, insert: false, update: false })
  hash: string | null;

  @Column({ type: 'timestamptz', nullable: true, insert: false, update: false })
  sealed_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
