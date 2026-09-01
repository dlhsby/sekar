import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { PunchLabel } from '../enums/punch-label.enum';

/**
 * AttendancePunch — the append-only attendance log (ADR-055).
 *
 * Every clock-in / clock-out is one immutable inserted row. A shift's SESSION
 * (Jam Masuk = first clock-in, Jam Keluar = last clock-out, worked hours =
 * paired segments, open? = last punch is a clock-in) is DERIVED from an ordered
 * stream of these punches — never stored here. Punches are the source of truth;
 * the `shifts` row is a maintained projection of them.
 *
 * The PK is a client-supplied UUID so an offline retry of the same punch is a
 * no-op (ON CONFLICT DO NOTHING) — idempotency without a dedupe table.
 * Rows are NEVER updated or deleted on the live path (corrections are deferred,
 * ADR-055 v1); ordering is always by `punched_at`, not insert/arrival order.
 */
@Entity('attendance_punches')
@Index('idx_attendance_punches_user_service_day', ['user_id', 'service_day'])
@Index('idx_attendance_punches_session', [
  'user_id',
  'service_day',
  'shift_definition_id',
  'is_overtime',
])
export class AttendancePunch {
  @ApiProperty({ description: 'Client-supplied UUID (idempotency key)' })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User UUID (foreign key to users table)' })
  @Column('uuid')
  @Index('idx_attendance_punches_user')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ApiProperty({ description: 'When the punch happened (the authoritative instant)' })
  @Column({ type: 'timestamp with time zone' })
  punched_at: Date;

  @ApiProperty({ enum: PunchLabel, description: 'clock_in | clock_out' })
  @Column({ type: 'varchar', length: 16 })
  label: PunchLabel;

  /**
   * The WIB calendar day the punch's SESSION belongs to — not necessarily the
   * calendar day of `punched_at`. A Shift-3 clock-out at 03:00 carries the
   * previous day's `service_day` so it pairs with its 21:00 clock-in.
   */
  @ApiProperty({ description: 'WIB service-day the session belongs to (YYYY-MM-DD)' })
  @Column({ type: 'date' })
  service_day: string;

  @ApiProperty({ description: 'Shift definition the punch is attributed to', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  shift_definition_id: string | null;

  @ApiProperty({ description: 'Area the GPS landed in (auto-detected)', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @ApiProperty({ description: 'GPS latitude at the punch', nullable: true })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value != null ? parseFloat(value) : null),
    },
  })
  gps_lat: number | null;

  @ApiProperty({ description: 'GPS longitude at the punch', nullable: true })
  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value != null ? parseFloat(value) : null),
    },
  })
  gps_lng: number | null;

  @ApiProperty({ description: 'GPS accuracy in metres, if reported', nullable: true })
  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value != null ? parseFloat(value) : null),
    },
  })
  accuracy_m: number | null;

  @ApiProperty({ description: 'Whether the worker was outside the area boundary at the punch' })
  @Column({ type: 'boolean', default: false })
  outside_boundary: boolean;

  /**
   * Whether the fix reported an accuracy too poor to be meaningful.
   *
   * Advisory, exactly like `outside_boundary`: a bad fix under tree canopy is
   * the honest case and must never block a punch. Recorded so a supervisor can
   * tell "outside the area" from "we do not really know where they were".
   */
  @ApiProperty({ description: 'Whether the GPS accuracy was too poor to be reliable' })
  @Column({ type: 'boolean', default: false })
  poor_accuracy: boolean;

  /**
   * `client capture time - server receive time`, in milliseconds. Negative means
   * the device claimed the punch happened earlier than it arrived.
   *
   * A large negative value is normal for the offline queue (a shift with no
   * signal syncs hours later) and suspicious for an online punch, so the raw
   * number is stored rather than a verdict. `punched_at` itself is clamped into
   * the allowed window; this is what the clamp hid.
   */
  @ApiProperty({ description: 'Client/server clock difference at the punch, in ms' })
  @Column({
    type: 'bigint',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value != null ? parseInt(value, 10) : 0),
    },
  })
  clock_skew_ms: number;

  @ApiProperty({ description: 'Selfie photo (base64 data-URI or S3 URL)', nullable: true })
  @Column({ type: 'text', nullable: true })
  photo_url: string | null;

  @ApiProperty({ description: 'Whether this punch belongs to an overtime session (ADR-014)' })
  @Column({ name: 'is_overtime', type: 'boolean', default: false })
  is_overtime: boolean;

  @ApiProperty({ description: 'When the row was inserted (server clock; audit only)' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
